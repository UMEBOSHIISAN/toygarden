/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * demoStream() を EventBus に流し、cli.ts と同じミッションコントロール画面を再現する。
 *
 * GIF描画用の label() / renderDashboard() / demoStream() はここではローカル定義を使う。
 * index.ts の同名関数は cli.ts の端末表示用（font8x8 未収録の漢字・記号を含む）で、
 * そちらは変更しない。demo() が実際に描く文字列だけを収録済みグリフに置き換える。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import { EventBus } from "@toygarden/core-events";
import { color, GREEN, RED, YELLOW, DIM } from "@toygarden/core-tui";
import type { PlayEvent } from "@toygarden/contracts";
import { tally, type Counts } from "./index.ts";

const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

/** index.ts の label() と同じ分岐だが、font8x8 未収録の記号を ASCII 表記に置き換えたもの。 */
function demoLabel(e: PlayEvent): string {
  switch (e.kind) {
    case "agent.dispatch":
      return color(DIM, `→ ${e.from}=>${e.to} ${e.task}`);
    case "agent.collapse":
      return color(RED, `!! collapse ${e.agent} ${(e.rate * 100).toFixed(0)}%`);
    case "git.commit":
      return `${color(GREEN, `+${e.added}`)} ${color(RED, `-${e.removed}`)}${e.coauthoredByClaude ? color(DIM, " [AI]") : ""}`;
    case "worker.route":
      return color(YELLOW, `-> ${e.taxonomy}->${e.worker}`);
    case "gate.pending":
      return color(YELLOW, `|| gate: ${e.label}`);
    case "deploy.success":
      return color(GREEN, "ok deploy");
    case "task.done":
      return color(GREEN, `ok ${e.project}`);
    case "focus.activity":
      return color(DIM, `o ${e.activity}`);
    case "sys.pulse":
      return color(DIM, `~ busy:${(e.busyness * 100).toFixed(0)}%`);
    case "clock.tick":
      return color(DIM, "* tick");
    case "clock.chime":
      return color(YELLOW, `ding ${e.hour}:00`);
  }
}

/** index.ts の renderDashboard() と同じ構造だが、見出しの em dash を ASCII のハイフンに置き換えたもの。 */
function demoDashboard(recent: string[], counts: Counts): string {
  const rule = color(DIM, "─".repeat(52));
  const head = color(YELLOW, "▍ event-loom - mission control");
  const values = Object.values(counts).map((n) => n ?? 0);
  const total = values.reduce((s, n) => s + n, 0);
  const max = Math.max(1, ...values);
  const bars = (Object.entries(counts) as [PlayEvent["kind"], number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const bar = color(GREEN, "█".repeat(Math.round((n / max) * 16)).padEnd(16));
      return `  ${k.padEnd(15)} ${bar} ${String(n).padStart(2)}`;
    });
  return [head, rule, ...recent, rule, color(DIM, `  events: ${total}`), ...bars].join("\n");
}

/** index.ts の demoStream() と同じイベント列だが、文字列フィールドを収録済み文字に置き換えたもの。 */
function demoStreamRenderable(base = 1_783_200_000_000): PlayEvent[] {
  return [
    { kind: "focus.activity", activity: "at the PC", at: base },
    { kind: "agent.dispatch", from: "cc", to: "codex", task: "implement" },
    { kind: "git.commit", added: 42, removed: 3, coauthoredByClaude: true },
    { kind: "worker.route", taxonomy: "read_only_scan", worker: "qwen", confidence: 0.85 },
    { kind: "git.commit", added: 7, removed: 1, coauthoredByClaude: false },
    { kind: "gate.pending", label: "awaiting approval" },
    { kind: "agent.collapse", agent: "codex", rate: 0.2 },
    { kind: "task.done", project: "posting" },
    { kind: "focus.activity", activity: "thinking", at: base + 60000 },
    { kind: "agent.dispatch", from: "cc", to: "qwen", task: "classify" },
    { kind: "git.commit", added: 15, removed: 8, coauthoredByClaude: true },
    { kind: "worker.route", taxonomy: "impl_1_3_files", worker: "codex", confidence: 0.6 },
    { kind: "deploy.success" },
    { kind: "task.done", project: "shipping" },
  ];
}

export function demo(): DemoSpec {
  const bus = new EventBus();
  let recent: string[] = [];
  let counts: Counts = {};
  bus.subscribe((e) => {
    recent = [...recent, "  " + demoLabel(e)].slice(-8);
  });
  bus.subscribe((e) => {
    counts = tally(counts, e);
  });

  const stream = demoStreamRenderable();
  const frames: string[] = [];
  const TOTAL = stream.length * 2; // 1本のバスを2周させる
  for (let i = 0; i < TOTAL; i++) {
    bus.emit(stream[i % stream.length]);
    const header = `  ${CYAN}~ event-loom ~${RESET}  ${DIM}1 bus -> 2 subscribers${RESET}`;
    frames.push(header + "\n" + demoDashboard(recent, counts));
  }
  return {
    name: "event-loom",
    fps: 6,
    frames,
    uses: ["core-events", "core-tui", "contracts"],
    tagline: "Weaves every event on one bus into a live universal viewer.",
  };
}
