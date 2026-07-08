import { initAquarium, step, feed, render, type Aquarium } from "./index.ts";

/**
 * ascii-aquarium 実行エントリ。
 *   node dist/aquarium.mjs            → ライブ（Ctrl+C で終了）
 *   node dist/aquarium.mjs --frames 8 → 8フレーム描いて終了（キャプチャ/デモ用）
 */

import { colorize } from "./color.ts";

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

let tank: Aquarium = initAquarium();

function advance(feedChance: number): void {
  tank = step(tank);
  if (Math.random() < feedChance) tank = feed(tank, { kind: "task.done", project: "投稿" });
}

if (live) {
  process.stdout.write(HIDE);
  const cleanup = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  setInterval(() => {
    process.stdout.write(CLEAR);
    const moon = tank.night ? `  ${DIM}~ 夜 ~${RESET}` : "";
    process.stdout.write(`  ${CYAN}~ umeplay aquarium ~${RESET}  ${DIM}(Ctrl+C で終了)${RESET}${moon}\n`);
    process.stdout.write(colorize(render(tank), tank.night) + "\n");
    advance(0.12);
  }, 120);
} else {
  for (let i = 0; i < frames; i++) {
    process.stdout.write(colorize(render(tank), tank.night) + "\n\n");
    advance(i % 3 === 2 ? 1 : 0);
  }
}
