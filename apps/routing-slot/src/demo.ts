/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/routing-slot.gif を再生成する。
 * 実際の spin() を seeded rng で3回回し、3回目で jackpot が揃う（seed=6 で確認済み）。
 */
import { seeded, type DemoSpec } from "@umeplay/core-termgif";
import { spin } from "./index.ts";
import type { RoutingTrial } from "@umeplay/core-worker-data";
import { renderSpinning, renderStopped } from "./view.ts";

// routing_trial_ledger 由来の予測データ（形は RoutingTrial 実物と同じ）
const TRIALS: RoutingTrial[] = [
  { taxonomy: "read_only_scan", predictedWorker: "qwen", confidence: 0.55 },
  { taxonomy: "impl_1_3_files", predictedWorker: "codex", confidence: 0.7 },
  { taxonomy: "design_gate", predictedWorker: "cc", confidence: 0.4 },
  { taxonomy: "audit_scan", predictedWorker: "gemma", confidence: 0.92 },
  { taxonomy: "dispatch_route", predictedWorker: "codex", confidence: 0.85 },
];

export function demo(): DemoSpec {
  const rng = seeded(6); // このシードで3回目の spin() が jackpot になる（探索済み）
  const frames: string[] = [];

  for (let spinNo = 0; spinNo < 3; spinNo++) {
    for (let b = 0; b < 4; b++) frames.push(renderSpinning(TRIALS, spinNo * 3 + b));
    const r = spin(TRIALS, rng); // 実際の spin() を叩く（当落はここだけで決まる）
    for (let f = 0; f < (r.jackpot ? 6 : 3); f++) frames.push(renderStopped(r, f % 2 === 0));
  }

  return {
    name: "routing-slot",
    fps: 6,
    frames,
    uses: ["core-worker-data"],
    tagline: "Worker dispatch as a slot machine; the right fit hits the jackpot.",
  };
}
