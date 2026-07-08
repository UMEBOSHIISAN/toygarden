import { selectDevice } from "@toygarden/core-device";
import { renderScreen } from "./demo.ts";
import { draw, type Metrics } from "./index.ts";

/**
 * desk-weather 実行エントリ。
 *   node dist/desk-weather.mjs                              → 合成ドリフトをライブ表示（Ctrl+C で終了）
 *   node dist/desk-weather.mjs --dirty 3 --fail 1 --stale 0  → 指定メトリクスを1回だけ描画
 *   node dist/desk-weather.mjs --frames 24                   → 合成ドリフトを24フレームで終了（キャプチャ用）
 *
 * TOYGARDEN_DEVICE=m5 npm run play desk-weather で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const argv = process.argv.slice(2);
const opt = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};

const dirtyArg = opt("--dirty");
const failArg = opt("--fail");
const staleArg = opt("--stale");
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : null;

if (dirtyArg !== null || failArg !== null || staleArg !== null) {
  const m: Metrics = {
    dirtyFiles: Number(dirtyArg ?? 0),
    testFailures: Number(failArg ?? 0),
    staleMemory: Number(staleArg ?? 0),
  };
  draw(device, m);
  process.stdout.write(renderScreen(m, 0) + "\n");
  process.exit(0);
}

/** 実メトリクス源を持たない汎用ゲージなので、cli では緩やかに揺れる合成ドリフトで見せる。 */
function drift(tick: number): Metrics {
  const wave = (period: number, amp: number, phase = 0): number =>
    Math.max(0, Math.round((Math.sin(tick / period + phase) + 1) * 0.5 * amp));
  return {
    dirtyFiles: wave(11, 9),
    testFailures: wave(17, 4, 1.3),
    staleMemory: wave(23, 5, 2.5),
  };
}

let tick = 0;

if (frameCount !== null) {
  for (let i = 0; i < frameCount; i++) {
    const m = drift(tick);
    draw(device, m);
    process.stdout.write(renderScreen(m, tick) + "\n\n");
    tick++;
  }
} else {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(() => {
    const m = drift(tick);
    draw(device, m);
    process.stdout.write(CLEAR + renderScreen(m, tick) + "\n");
    tick++;
  }, 400);
}
