import type { PlayEvent, PlayEventKind } from "@umeplay/contracts";
import { EventBus } from "@umeplay/core-events";
import { color, GREEN, RED, YELLOW, DIM } from "@umeplay/core-tui";

/**
 * event-loom （events × tui）
 * → 「どんな PlayEvent ストリームも、1本の色付きティッカーに織る」。
 * EventBus を購読し、あらゆるイベント種別を1行の流れる表示に変換する汎用ビューア。
 * OSS価値: このモノレポの"共通言語"(PlayEvent)を可視化する土台。1本のバスに複数の
 * 購読者(ティッカー＋カウンタ)が疎結合で繋がる = キットの思想そのもののデモ。
 */

export function label(e: PlayEvent): string {
  switch (e.kind) {
    case "agent.dispatch":
      return color(DIM, `→ ${e.from}⇒${e.to} ${e.task}`);
    case "agent.collapse":
      return color(RED, `!! collapse ${e.agent} ${(e.rate * 100).toFixed(0)}%`);
    case "git.commit":
      return `${color(GREEN, `+${e.added}`)} ${color(RED, `-${e.removed}`)}${e.coauthoredByClaude ? color(DIM, " [AI]") : ""}`;
    case "worker.route":
      return color(YELLOW, `⇢ ${e.taxonomy}→${e.worker}`);
    case "gate.pending":
      return color(YELLOW, `⏸ gate: ${e.label}`);
    case "deploy.success":
      return color(GREEN, "✓ deploy");
    case "task.done":
      return color(GREEN, `✔ ${e.project}`);
    case "focus.activity":
      return color(DIM, `◎ ${e.activity}`);
  }
}

/** EventBus を織り機に繋ぐ。流れてきたイベントを1行ずつ sink に渡す。 */
export function loom(bus: EventBus, sink: (line: string) => void): () => void {
  return bus.subscribe((e) => sink(label(e)));
}

export type Counts = Partial<Record<PlayEventKind, number>>;

/** イベント種別ごとの累計（疎結合な2つ目の購読者向け）。 */
export function tally(counts: Counts, e: PlayEvent): Counts {
  return { ...counts, [e.kind]: (counts[e.kind] ?? 0) + 1 };
}

/** ミッションコントロール画面: 直近ティッカー＋種別カウンタ棒グラフ。純関数。 */
export function renderDashboard(recent: string[], counts: Counts): string {
  const rule = color(DIM, "─".repeat(52));
  const head = color(YELLOW, "▍ event-loom — mission control");
  const values = Object.values(counts).map((n) => n ?? 0);
  const total = values.reduce((s, n) => s + n, 0);
  const max = Math.max(1, ...values);
  const bars = (Object.entries(counts) as [PlayEventKind, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const bar = color(GREEN, "█".repeat(Math.round((n / max) * 16)).padEnd(16));
      return `  ${k.padEnd(15)} ${bar} ${String(n).padStart(2)}`;
    });
  return [head, rule, ...recent, rule, color(DIM, `  events: ${total}`), ...bars].join("\n");
}

/** デモ用の現実的なイベント列（1セッションの流れ・cli がループ再生する）。 */
export function demoStream(base = 1_783_200_000_000): PlayEvent[] {
  return [
    { kind: "focus.activity", activity: "PCに向かっている", at: base },
    { kind: "agent.dispatch", from: "cc", to: "codex", task: "実装" },
    { kind: "git.commit", added: 42, removed: 3, coauthoredByClaude: true },
    { kind: "worker.route", taxonomy: "read_only_scan", worker: "qwen", confidence: 0.85 },
    { kind: "git.commit", added: 7, removed: 1, coauthoredByClaude: false },
    { kind: "gate.pending", label: "承認待ち" },
    { kind: "agent.collapse", agent: "codex", rate: 0.2 },
    { kind: "task.done", project: "投稿" },
    { kind: "focus.activity", activity: "考え事をしている", at: base + 60000 },
    { kind: "agent.dispatch", from: "cc", to: "qwen", task: "分類" },
    { kind: "git.commit", added: 15, removed: 8, coauthoredByClaude: true },
    { kind: "worker.route", taxonomy: "impl_1_3_files", worker: "codex", confidence: 0.6 },
    { kind: "deploy.success" },
    { kind: "task.done", project: "発送" },
  ];
}
