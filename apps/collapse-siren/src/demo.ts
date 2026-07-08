/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/collapse-siren.gif を再生成する。
 * 実際の EventBus + attachSiren() を叩き、崩壊率が閾値を超えた瞬間の警報をそのまま描く。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import type { PlayEvent, Agent } from "@umeplay/contracts";
import { EventBus } from "@umeplay/core-events";
import { attachSiren } from "./index.ts";
import { renderSiren, type AgentRow } from "./view.ts";

const AGENTS: Agent[] = ["codex", "qwen", "gemma", "cc"];
const THRESHOLD = 0.1;

// 4エージェント分の崩壊率の推移（穏やか → codex 急上昇 → qwen も連鎖 → 収束）
const READINGS: { agent: Agent; rate: number }[] = [
  { agent: "cc", rate: 0.02 },
  { agent: "qwen", rate: 0.04 },
  { agent: "codex", rate: 0.06 },
  { agent: "gemma", rate: 0.03 },
  { agent: "codex", rate: 0.09 },
  { agent: "codex", rate: 0.13 },
  { agent: "codex", rate: 0.16 },
  { agent: "qwen", rate: 0.14 },
  { agent: "codex", rate: 0.07 },
  { agent: "qwen", rate: 0.05 },
];

export function demo(): DemoSpec {
  const bus = new EventBus();
  let justTripped: string | null = null;
  attachSiren(bus, (agent) => { justTripped = agent; }, THRESHOLD); // 実際の attachSiren() を叩く

  const latest = new Map<string, number>(AGENTS.map((a) => [a, 0]));
  const rowsFor = (): AgentRow[] => AGENTS.map((a) => ({ agent: a, rate: latest.get(a) ?? 0 }));

  const frames: string[] = [];
  frames.push(renderSiren(rowsFor(), THRESHOLD, null));
  frames.push(renderSiren(rowsFor(), THRESHOLD, null));

  for (const reading of READINGS) {
    justTripped = null;
    const e: PlayEvent = { kind: "agent.collapse", agent: reading.agent, rate: reading.rate };
    bus.emit(e); // attachSiren のハンドラがここで発火する
    latest.set(reading.agent, reading.rate);
    const reps = justTripped ? 3 : 1;
    for (let r = 0; r < reps; r++) frames.push(renderSiren(rowsFor(), THRESHOLD, justTripped));
  }

  for (let k = 0; k < 3; k++) frames.push(renderSiren(rowsFor(), THRESHOLD, null));

  return {
    name: "collapse-siren",
    fps: 6,
    frames,
    uses: ["core-worker-data", "core-chiptune", "core-events"],
    tagline: "When collapse rate crosses a threshold, the terminal blares a dissonant siren.",
  };
}
