import type { RoutingTrial } from "@toygarden/core-worker-data";

/**
 * routing-slot — worker 配車をスロット演出で。回すと task種別×worker×confidence が揃う。
 * routing_trial_ledger の予測を遊びで貯める（データ収集の娯楽化）。
 */

export interface SpinResult {
  taxonomy: string;
  worker: string;
  confidence: number;
  jackpot: boolean; // confidence >= 0.8
}

/** rng を注入可能に（テストで決定的に）。 */
export function spin(
  trials: RoutingTrial[],
  rng: () => number = Math.random,
): SpinResult {
  if (trials.length === 0) throw new Error("no trials to spin");
  const t = trials[Math.floor(rng() * trials.length)];
  return {
    taxonomy: t.taxonomy,
    worker: t.predictedWorker,
    confidence: t.confidence,
    jackpot: t.confidence >= 0.8,
  };
}

export function reel(r: SpinResult): string {
  const pct = `${(r.confidence * 100).toFixed(0)}%`;
  return `[ ${r.taxonomy} | ${r.worker} | ${pct} ]${r.jackpot ? " ***JACKPOT***" : ""}`;
}
