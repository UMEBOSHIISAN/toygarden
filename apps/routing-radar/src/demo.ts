/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * confidence を 0 → 最終値へ徐々に伸ばしながら radar() を呼び直し、
 * バーが伸びる/確信度順の並びが入れ替わる様子を再現する。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import { seeded } from "@toygarden/core-termgif";
import type { RoutingTrial } from "@toygarden/core-worker-data";
import { radar } from "./index.ts";

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/** demo() と cli.ts のフォールバック描画の両方から使う共通サンプル。 */
export const FINAL: RoutingTrial[] = [
  { taxonomy: "read_only_scan", predictedWorker: "qwen", confidence: 0.85 },
  { taxonomy: "impl_1_3_files", predictedWorker: "codex", confidence: 0.72 },
  { taxonomy: "design_gate", predictedWorker: "cc", confidence: 0.63 },
  { taxonomy: "duplicate_cluster", predictedWorker: "qwen", confidence: 0.58 },
  { taxonomy: "review_task", predictedWorker: "gemma", confidence: 0.44 },
  { taxonomy: "strategy_decision", predictedWorker: "human", confidence: 0.2 },
];

export function demo(): DemoSpec {
  const rnd = seeded(930);
  const frames: string[] = [];
  const STEPS = 24;
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS;
    const trials = FINAL.map((f) => ({
      ...f,
      confidence: Math.min(f.confidence, f.confidence * t + rnd() * 0.01),
    }));
    const header = `  ${CYAN}~ routing radar ~${RESET}  ${DIM}which worker to route to${RESET}`;
    frames.push(header + "\n" + radar(trials));
  }
  for (let i = 0; i < 6; i++) frames.push(frames[frames.length - 1]);
  return {
    name: "routing-radar",
    fps: 6,
    frames,
    uses: ["core-worker-data", "core-tui"],
    tagline: "A radar surveying dispatch hit-rate with confidence bars.",
  };
}
