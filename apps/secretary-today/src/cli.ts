import { render, blockedCount, type TodayState } from "./index.ts";
import { badge } from "@toygarden/core-tui";

/**
 * secretary-today 実行エントリ。
 *   node dist/secretary-today.mjs             → サンプルの一日をライブ再生（Ctrl+C で終了）
 *   node dist/secretary-today.mjs --frames 12 → 12フレームで終了（キャプチャ用）
 *
 * 実データ接続は今後（今は UME_SOUL 優先順位のサンプル状態を表示する）。
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

const state: TodayState = {
  投稿: [
    { label: "今朝の投稿案", status: "blocked" },
    { label: "予約投稿 20:45", status: "blocked" },
  ],
  発送: [
    { label: "注文 3件", status: "blocked" },
    { label: "ラベル印刷", status: "ok" },
  ],
  データ: [{ label: "UTM 集計", status: "blocked" }],
  経理: [{ label: "月次の仕訳", status: "idle" }],
  開発: [{ label: "安定してるので触らない", status: "idle" }],
};

// blocked を優先順位の上から順に1つずつ解決していく
const queue: Array<() => void> = [];
for (const items of Object.values(state)) {
  for (const it of items ?? []) {
    if (it.status === "blocked") queue.push(() => (it.status = "ok"));
  }
}

let tick = 0;
function frame(): void {
  const header = `  ${CYAN}~ secretary-today ~${RESET}  ${DIM}止まっているものから片づける${RESET}  ${badge(blockedCount(state))}`;
  process.stdout.write(CLEAR + header + "\n\n" + render(state) + "\n");
  if (tick % 3 === 2) queue.shift()?.();
  tick++;
}

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(frame, 700);
} else {
  for (let k = 0; k < frames; k++) frame();
}
