import { EventBus } from "@toygarden/core-events";
import { selectDevice } from "@toygarden/core-device";
import { initState, applyEvent, draw, type ConstellationState } from "./index.ts";
import { renderScreen, demoStream } from "./demo.ts";

/**
 * agent-constellation 実行エントリ。dispatch/collapse イベントを星座で可視化する。
 *   node dist/agent-constellation.mjs             → ライブ表示（Ctrl+C で終了・1周ごとにリセット）
 *   node dist/agent-constellation.mjs --frames 16 → 16フレーム描いて終了（キャプチャ用）
 *
 * TOYGARDEN_DEVICE=m5 npm run play agent-constellation で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount);

let state: ConstellationState = initState();
const bus = new EventBus();
bus.subscribe((e) => {
  state = applyEvent(state, e);
});

const stream = demoStream();
let i = 0;

function frame(hint: string): string {
  if (i > 0 && i % stream.length === 0) state = initState(); // 1周ごとに星座をリセット
  bus.emit(stream[i % stream.length]);
  i++;
  draw(device, state);
  return renderScreen(state, hint);
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
    process.stdout.write(CLEAR + frame(" (Ctrl+C で しゅうりょう)") + "\n");
  }, 500);
} else {
  for (let k = 0; k < frameCount; k++) process.stdout.write(frame("") + "\n\n");
}
