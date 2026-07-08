import type { PlayEvent } from "@umeplay/contracts";
import { MockDevice } from "@umeplay/core-device";
import { mirror, labelFor, ledFor } from "./index.ts";
import { renderGadget } from "./view.ts";

/**
 * device-mirror 実行エントリ。
 *   node dist/device-mirror.mjs             → ライブ（Ctrl+C で終了。イベント列をループ再生）
 *   node dist/device-mirror.mjs --frames 20 → 20フレームで終了（キャプチャ用）
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const SCRIPT: { event: PlayEvent; caption: string; button?: number }[] = [
  { event: { kind: "task.done", project: "投稿" }, caption: "とうこう done", button: 0 },
  { event: { kind: "task.done", project: "投稿" }, caption: "とうこう done" },
  { event: { kind: "gate.pending", label: "review" }, caption: "しょうにん まち..." },
  { event: { kind: "agent.dispatch", from: "cc", to: "codex", task: "impl" }, caption: "dispatch", button: 1 },
  { event: { kind: "worker.route", taxonomy: "impl", worker: "codex", confidence: 0.8 }, caption: "route ok" },
  { event: { kind: "deploy.success" }, caption: "でぷろい OK", button: 2 },
];

const device = new MockDevice();
const dev = mirror(device);

/** 1つのイベントを液晶へ描き、フレーム列（押下前後）を返す。ボタン指定があれば1コマだけハイライトする。 */
function* frame(event: PlayEvent, caption: string, button?: number): Generator<string> {
  dev.draw({ op: "clear" });
  dev.draw({ op: "text", x: 8, y: 8, text: labelFor(event) });
  dev.draw({ op: "text", x: 8, y: 8 + 16, text: caption });
  dev.led(ledFor(event));
  dev.flush();
  yield renderGadget(dev.snapshot());
  yield renderGadget(dev.snapshot());

  if (button !== undefined) {
    device.pressButton(button);
    yield renderGadget(dev.snapshot());
    dev.release();
    yield renderGadget(dev.snapshot());
  }
}

/** イベント列をループ再生し続けるジェネレータ。 */
function* play(): Generator<string> {
  for (;;) {
    for (const { event, caption, button } of SCRIPT) {
      yield* frame(event, caption, button);
    }
  }
}

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount);
const gen = play();

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(() => {
    process.stdout.write(CLEAR + gen.next().value + "\n");
  }, 320);
} else {
  for (let k = 0; k < frameCount; k++) {
    process.stdout.write(gen.next().value + "\n\n");
  }
}
