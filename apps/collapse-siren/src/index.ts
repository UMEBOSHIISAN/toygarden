import type { Agent, PlayEvent } from "@umeplay/contracts";
import type { CollapseStat } from "@umeplay/core-worker-data";
import { motifForEvent, type Motif } from "@umeplay/core-chiptune";
import { EventBus } from "@umeplay/core-events";

/**
 * collapse-siren （worker-data × chiptune × events）
 * → 「エージェントの崩壊率が上がったら不協和音のサイレンを鳴らす」。
 * collapse データを PlayEvent に変換 → chiptune の collapse モチーフに写像。
 * OSS価値: 監視データを"音の警報"にする汎用アラーム部品。
 */

export interface Siren {
  agent: string;
  rate: number;
  motif: Motif;
}

export function sirensFor(stats: CollapseStat[], threshold = 0.1): Siren[] {
  return stats
    .filter((s) => s.rate > threshold)
    .map((s) => {
      const e: PlayEvent = { kind: "agent.collapse", agent: s.agent as Agent, rate: s.rate };
      return { agent: s.agent, rate: s.rate, motif: motifForEvent(e) as Motif };
    });
}

/** EventBus に繋ぐと、閾値超の collapse を検知して鳴らすべき agent を通知。 */
export function attachSiren(bus: EventBus, onSiren: (agent: string) => void, threshold = 0.1): () => void {
  return bus.subscribe((e) => {
    if (e.kind === "agent.collapse" && e.rate > threshold) onSiren(e.agent);
  });
}
