import type { PlayEvent, Agent } from "@umeplay/contracts";
import { EventBus } from "@umeplay/core-events";
import { attachSiren } from "./index.ts";
import { renderSiren, type AgentRow } from "./view.ts";

/**
 * collapse-siren 実行エントリ。
 *   node dist/siren.mjs             → ライブ（Ctrl+C で終了。崩壊率の推移をループ再生）
 *   node dist/siren.mjs --frames 21 → 21フレームで終了（キャプチャ用）
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const THRESHOLD = 0.1;
const AGENTS: Agent[] = ["codex", "qwen", "gemma", "cc"];

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

/** 崩壊率の推移を EventBus に流し、閾値超えを attachSiren() で検知しながら描く。無限ループ。 */
function* play(): Generator<string> {
  for (;;) {
    const bus = new EventBus();
    let justTripped: string | null = null;
    attachSiren(bus, (agent) => { justTripped = agent; }, THRESHOLD);

    const latest = new Map<string, number>(AGENTS.map((a) => [a, 0]));
    const rowsFor = (): AgentRow[] => AGENTS.map((a) => ({ agent: a, rate: latest.get(a) ?? 0 }));

    yield renderSiren(rowsFor(), THRESHOLD, null);
    yield renderSiren(rowsFor(), THRESHOLD, null);

    for (const reading of READINGS) {
      justTripped = null;
      const e: PlayEvent = { kind: "agent.collapse", agent: reading.agent, rate: reading.rate };
      bus.emit(e);
      latest.set(reading.agent, reading.rate);
      const reps = justTripped ? 3 : 1;
      for (let r = 0; r < reps; r++) yield renderSiren(rowsFor(), THRESHOLD, justTripped);
    }

    for (let k = 0; k < 3; k++) yield renderSiren(rowsFor(), THRESHOLD, null);
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
  }, 240);
} else {
  for (let k = 0; k < frameCount; k++) {
    process.stdout.write(gen.next().value + "\n\n");
  }
}
