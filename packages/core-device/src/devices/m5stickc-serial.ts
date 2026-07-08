import { openSync, createReadStream, createWriteStream } from "node:fs";
import type { ReadStream, WriteStream } from "node:fs";
import { spawnSync } from "node:child_process";
import type { Device, DrawCommand, PanelSize, RGB } from "../hal.js";

/**
 * M5StickC Plus 実機ドライバ（設計 §4.5 — 初の実機ドライバ）。
 * 依存ゼロ：serialport 等のライブラリを使わず、macOS 古典手法（fd を掴んだまま
 * stty でポート設定 → 同じ fd を Read/WriteStream で使う）で通信する。
 *
 * ワイヤプロトコル（改行区切り JSON・115200 baud、ファームウェア側と固定契約）:
 *   送信: {"op":"clear"} / {"op":"text",x,y,text} / {"op":"rect",x,y,w,h,color?}
 *         {"op":"led",r,g,b} / {"op":"flush"}
 *   受信: {"btn":0|1}（ボタンA/B押下）/ 起動時 {"hello":"toygarden",w,h}（無視）
 *        / {"ack":"<op>"}（正常受理・無視）/ {"err":"parse"}（parse失敗通知・無視）
 *
 * open順序が重要（2026-07-08 実機統合で判明）: macOS はシリアルポートの参照が
 * 全て close されると termios 設定（115200 raw）がデフォルト(9600)へ戻る。
 * 「stty を単独プロセスで叩いて閉じる→後から Node で開く」の順だと、stty プロセスが
 * 抜けた瞬間に設定が消えて Node 側は 9600 で開くことになり、文字化けでファームウェアの
 * JSON パーサに一切届かない（エラーも出ない静かな故障）。
 * 正しい順序: 先に自分の fd でポートを開いて掴んだままにする → その fd が生きている間に
 * stty で設定する（他に参照がある間は設定が保持される）→ ESP32 は open 時の DTR トグルで
 * 自動リセットされるため起動を待つ（実機実測 約2.5〜3秒）→ 書き込みを開始する。
 *
 * ポートが無い/stty が失敗する環境（CI・ハード未接続）では fail-soft で
 * no-op デバイス化する。おもちゃを殺さないことが実機ドライバの前提（§4.8）。
 */

const DEFAULT_PORT = "/dev/cu.usbserial-8D52591E38";
const BAUD = "115200";
/** open の DTR トグルで ESP32 が再起動してから、書き込みが実際に届くようになるまでの待ち時間（実機実測）。 */
const BOOT_WAIT_MS = 2800;

/** DrawCommand の op はプロトコルの op と1:1（clear/text/rect）なので素通しで1行JSON化する。 */
export function encodeDrawLine(cmd: DrawCommand): string {
  // 実機ファームのフォント処理は非ASCIIで watchdog リセットを起こしうる（2026-07-08
  // 実測: 顔文字入り text で TG1WDT_SYS_RESET の再起動ループ）。ファーム側にも同じ
  // ガードを入れてあるが、壊れた/古いファームも守るため送信側でも ASCII に落とす。
  if (cmd.op === "text") {
    // eslint-disable-next-line no-control-regex
    const ascii = cmd.text.replace(/[^\x20-\x7e]/g, "?");
    return JSON.stringify({ ...cmd, text: ascii }) + "\n";
  }
  return JSON.stringify(cmd) + "\n";
}

export function encodeLedLine(color: RGB): string {
  return JSON.stringify({ op: "led", r: color.r, g: color.g, b: color.b }) + "\n";
}

export function encodeFlushLine(): string {
  return JSON.stringify({ op: "flush" }) + "\n";
}

/**
 * 受信バイト列（チャンク単位で届く）を行単位に切り出す純関数。
 * 未確定の末尾（改行がまだ来ていない部分）は carry として次回呼び出しに持ち越す。
 */
export function splitLines(carry: string, chunk: string): { lines: string[]; carry: string } {
  const combined = carry + chunk;
  const parts = combined.split("\n");
  const carryOut = parts.pop() ?? "";
  return { lines: parts.map((l) => l.trim()).filter((l) => l.length > 0), carry: carryOut };
}

/**
 * 1行を {"btn":N} としてパース。それ以外（{"hello":...} / {"ack":...} / {"err":...} /
 * 壊れたJSON）は null を返し無視する。
 */
export function parseButtonLine(line: string): number | null {
  try {
    const obj: unknown = JSON.parse(line);
    if (
      obj !== null &&
      typeof obj === "object" &&
      "btn" in obj &&
      typeof (obj as { btn: unknown }).btn === "number"
    ) {
      return (obj as { btn: number }).btn;
    }
  } catch {
    // 壊れた行は無視（ノイズ/文字化け/部分行を許容する）
  }
  return null;
}

export class M5StickCSerialDevice implements Device {
  readonly id = "m5stickc-serial";

  private readonly size: PanelSize = { width: 240, height: 135 };
  private buffer: string[] = [];
  private readonly buttonHandlers = new Set<(b: number) => void>();
  private carry = "";
  private writeStream: WriteStream | null = null;
  private readStream: ReadStream | null = null;
  /** false になったら以降 draw/led/flush は全て no-op（fail-soft）。 */
  private enabled: boolean;
  /** ESP32 の DTR リセット起動待ちが終わり、書き込みが実際に届くようになったか。 */
  private ready = false;

  constructor(port: string = process.env.TOYGARDEN_SERIAL_PORT ?? DEFAULT_PORT) {
    this.enabled = this.tryOpen(port);
  }

  private tryOpen(port: string): boolean {
    // 先に自分の fd でポートを開いて掴んだままにする。この fd が生きている間だけ
    // 直後の stty 設定が保持される（全 close で 9600 に戻る macOS の挙動対策・実機実測）。
    let fd: number;
    try {
      fd = openSync(port, "r+");
    } catch (err) {
      console.warn(
        `[m5stickc-serial] failed to open ${port}: ${(err as Error).message} — falling back to no-op device`,
      );
      return false;
    }

    try {
      const result = spawnSync("stty", ["-f", port, BAUD, "raw", "-echo"], {
        stdio: ["ignore", "ignore", "pipe"],
      });
      if (result.error || result.status !== 0) {
        console.warn(
          `[m5stickc-serial] stty setup failed for ${port} (device may be unplugged) — falling back to no-op device`,
        );
        return false;
      }
    } catch (err) {
      console.warn(`[m5stickc-serial] stty threw for ${port}: ${(err as Error).message} — no-op device`);
      return false;
    }

    try {
      // 新たに path から開き直さない（＝2回目の DTR トグルを起こさない）。
      // 既に掴んでいる fd をそのまま Read/WriteStream に渡す。
      const ws = createWriteStream(port, { fd, autoClose: false });
      ws.on("error", (err) => {
        console.warn(`[m5stickc-serial] write stream error on ${port}: ${err.message} — disabling`);
        this.enabled = false;
      });
      this.writeStream = ws;

      const rs = createReadStream(port, { fd, autoClose: false });
      rs.on("data", (chunk) => this.onData(chunk.toString("utf8")));
      rs.on("error", (err) => {
        console.warn(`[m5stickc-serial] read stream error on ${port}: ${err.message} — disabling`);
        this.enabled = false;
      });
      this.readStream = rs;
    } catch (err) {
      console.warn(`[m5stickc-serial] failed to open streams for ${port}: ${(err as Error).message} — no-op device`);
      return false;
    }

    // open の DTR トグルで ESP32 が再起動する。起動が終わるまでは書いても失われるだけ
    // なので、readyになるまではバッファに積んだままにする（draw/flush 側でガード）。
    // ready 成立時にバッファ残があれば自動送出する（app が「状態変化時のみ flush」型だと
    // gate 内に飲まれた初回描画を送る機会が二度と来ない — 2026-07-08 実機で実証）。
    setTimeout(() => {
      this.ready = true;
      if (this.enabled && this.buffer.length > 0) {
        const payload = this.buffer.join("");
        this.buffer = [];
        this.safeWrite(payload);
      }
    }, BOOT_WAIT_MS).unref();

    return true;
  }

  private onData(chunk: string): void {
    const { lines, carry } = splitLines(this.carry, chunk);
    this.carry = carry;
    for (const line of lines) {
      const btn = parseButtonLine(line);
      if (btn !== null) {
        for (const h of this.buttonHandlers) h(btn);
      }
    }
  }

  panelSize(): PanelSize {
    return this.size;
  }

  draw(cmd: DrawCommand): void {
    if (!this.enabled) return;
    this.buffer.push(encodeDrawLine(cmd));
  }

  onButton(handler: (button: number) => void): () => void {
    this.buttonHandlers.add(handler);
    return () => {
      this.buttonHandlers.delete(handler);
    };
  }

  led(color: RGB): void {
    if (!this.enabled || !this.ready) return;
    this.safeWrite(encodeLedLine(color));
  }

  flush(): void {
    if (!this.enabled) {
      this.buffer = [];
      return;
    }
    this.buffer.push(encodeFlushLine());
    if (!this.ready) return; // 起動待ち中。バッファに積んだまま次の flush へ持ち越す
    const payload = this.buffer.join("");
    this.buffer = [];
    this.safeWrite(payload);
  }

  private safeWrite(data: string): void {
    try {
      if (process.env.TOYGARDEN_DEBUG === "1") {
        console.warn(`[m5-debug] write ${data.length}B: ${data.slice(0, 80).replace(/\n/g, "|")}`);
      }
      this.writeStream?.write(data);
    } catch (err) {
      console.warn(`[m5stickc-serial] write failed: ${(err as Error).message} — disabling`);
      this.enabled = false;
    }
  }
}
