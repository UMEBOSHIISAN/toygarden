import type { Agent, PlayEvent } from "@umeplay/contracts";

export interface RoutingTrial {
  taxonomy: string;
  predictedWorker: string;
  confidence: number;
}
export interface CollapseStat {
  agent: string;
  rate: number;
}

// コメント(#, //)・空行・ヘッダ行を捨てて TSV 行だけ返す共通前処理。
function tsvRows(raw: string): string[][] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("//"))
    .map((l) => l.split("\t").map((c) => c.trim()));
}

/** routing_trial_ledger（TSV: taxonomy \t worker \t confidence）を read-only パース。 */
export function parseRoutingLedger(raw: string): RoutingTrial[] {
  return tsvRows(raw)
    .filter((c) => c.length >= 3 && c[0].toLowerCase() !== "taxonomy")
    .map(([taxonomy, predictedWorker, confidence]) => ({
      taxonomy,
      predictedWorker,
      confidence: Number(confidence),
    }))
    .filter((t) => !Number.isNaN(t.confidence));
}

/** collapse 統計（TSV: agent \t rate）を read-only パース。 */
export function parseCollapseStats(raw: string): CollapseStat[] {
  return tsvRows(raw)
    .filter((c) => c.length >= 2 && c[0].toLowerCase() !== "agent")
    .map(([agent, rate]) => ({ agent, rate: Number(rate) }))
    .filter((s) => !Number.isNaN(s.rate));
}

/** RoutingTrial → worker.route イベント（設計 §4.6）。 */
export function routingToEvents(trials: RoutingTrial[]): PlayEvent[] {
  return trials.map((t) => ({
    kind: "worker.route" as const,
    taxonomy: t.taxonomy,
    worker: t.predictedWorker as Agent,
    confidence: t.confidence,
  }));
}

/** CollapseStat → agent.collapse イベント。 */
export function collapseToEvents(stats: CollapseStat[]): PlayEvent[] {
  return stats.map((s) => ({
    kind: "agent.collapse" as const,
    agent: s.agent as Agent,
    rate: s.rate,
  }));
}
