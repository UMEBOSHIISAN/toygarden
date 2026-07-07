import type { RoutingTrial } from "@umeplay/core-worker-data";
import { color, YELLOW, GREEN } from "@umeplay/core-tui";

/**
 * routing-radar （worker-data × tui）
 * → 「どの種類のタスクをどの worker に振ると当たるか、を confidence バーで一覧」。
 * routing_trial_ledger を確信度順に並べた配車ダッシュボード。
 * OSS価値: LLM ルーティング実験の可視化ボード。
 */

export function radar(trials: RoutingTrial[]): string {
  const sorted = [...trials].sort((a, b) => b.confidence - a.confidence);
  const rows = sorted.map((t) => {
    const bar = "█".repeat(Math.round(t.confidence * 10));
    const pct = `${(t.confidence * 100).toFixed(0)}%`.padStart(4);
    return `  ${t.taxonomy.padEnd(18)} ${color(GREEN, bar.padEnd(10))} ${pct}  ${t.predictedWorker}`;
  });
  return [color(YELLOW, "▍ routing radar"), ...rows].join("\n");
}
