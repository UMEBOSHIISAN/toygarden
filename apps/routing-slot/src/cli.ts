import { spin } from "./index.ts";
import type { RoutingTrial } from "@toygarden/core-worker-data";
import { renderSpinning, renderStopped } from "./view.ts";

/**
 * routing-slot 実行エントリ。
 *   node dist/slot.mjs             → ライブ（Ctrl+C で終了。回すたびに新しい抽選）
 *   node dist/slot.mjs --frames 24 → 24フレームで終了（キャプチャ用）
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const TRIALS: RoutingTrial[] = [
  { taxonomy: "read_only_scan", predictedWorker: "qwen", confidence: 0.55 },
  { taxonomy: "impl_1_3_files", predictedWorker: "codex", confidence: 0.7 },
  { taxonomy: "design_gate", predictedWorker: "cc", confidence: 0.4 },
  { taxonomy: "audit_scan", predictedWorker: "gemma", confidence: 0.92 },
  { taxonomy: "dispatch_route", predictedWorker: "codex", confidence: 0.85 },
];

/** 回転 → 停止 → (jackpot なら長めに祝う) を無限に繰り返す画面ジェネレータ。 */
function* play(): Generator<string> {
  let spinNo = 0;
  for (;;) {
    for (let b = 0; b < 4; b++) yield renderSpinning(TRIALS, spinNo * 3 + b);
    const r = spin(TRIALS); // rng 省略 = Math.random（ライブは本物の抽選）
    for (let f = 0; f < (r.jackpot ? 6 : 3); f++) yield renderStopped(r, f % 2 === 0);
    spinNo++;
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
  }, 200);
} else {
  for (let k = 0; k < frameCount; k++) {
    process.stdout.write(gen.next().value + "\n\n");
  }
}
