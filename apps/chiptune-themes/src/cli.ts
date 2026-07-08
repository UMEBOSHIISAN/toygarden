import { EventBus } from "@umeplay/core-events";
import { attachNotifier } from "./index.ts";
import { renderScreen, SCENES } from "./demo.ts";

/**
 * chiptune-themes 実行エントリ。イベント種別ごとの音テーマを可視化する（既定は無音）。
 *   node dist/chiptune-themes.mjs             → ライブ表示（Ctrl+C で終了）
 *   node dist/chiptune-themes.mjs --play      → afplay 経由で実際に音も鳴らす
 *   node dist/chiptune-themes.mjs --frames 16 → 16フレーム描いて終了（キャプチャ用）
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount);
const shouldPlay = argv.includes("--play");

const bus = new EventBus();
if (shouldPlay) attachNotifier(bus);

let sceneIdx = 0;
let revealed = 0;
let holds = 0;

function step(hint: string): string {
  const scene = SCENES[sceneIdx];
  if (revealed === 0 && holds === 0) bus.emit(scene.event);
  const screen = renderScreen(scene, revealed, hint);
  revealed++;
  const maxSteps = 6;
  if (revealed > maxSteps) {
    holds++;
    if (holds > 2) {
      sceneIdx = (sceneIdx + 1) % SCENES.length;
      revealed = 0;
      holds = 0;
    }
  }
  return screen;
}

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(() => {
    process.stdout.write(CLEAR + step(" (Ctrl+C で しゅうりょう)") + "\n");
  }, 500);
} else {
  for (let i = 0; i < frameCount; i++) process.stdout.write(step("") + "\n\n");
}
