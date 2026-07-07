import { EventBus } from "@umeplay/core-events";
import { label, tally, renderDashboard, demoStream, type Counts } from "./index.ts";

/**
 * event-loom 実行エントリ — ミッションコントロール。
 * 1本の EventBus に現実的なイベント列を流し、疎結合な2購読者(ティッカー＋カウンタ)が反応する。
 *   node dist/loom.mjs             → ライブ（Ctrl+C で終了）
 *   node dist/loom.mjs --frames 20 → 20フレームで終了（キャプチャ用）
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frames = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frames);

// 1本のバスに、互いを知らない2つの購読者を繋ぐ（疎結合の実証）
const bus = new EventBus();
let recent: string[] = [];
let counts: Counts = {};
bus.subscribe((e) => {
  recent = [...recent, "  " + label(e)].slice(-8);
});
bus.subscribe((e) => {
  counts = tally(counts, e);
});

const stream = demoStream();
let i = 0;

function frame(): void {
  bus.emit(stream[i % stream.length]);
  i++;
  const header = `  ${CYAN}~ event-loom ~${RESET}  ${DIM}1 bus → 2 subscribers (Ctrl+C で終了)${RESET}`;
  process.stdout.write(CLEAR + header + "\n" + renderDashboard(recent, counts) + "\n");
}

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(frame, 380);
} else {
  for (let k = 0; k < frames; k++) frame();
}
