import type { PlayEvent } from "@umeplay/contracts";
import { EventBus } from "@umeplay/core-events";
import { color, GREEN, RED, YELLOW, DIM } from "@umeplay/core-tui";

/**
 * event-loom （events × tui）
 * → 「どんな PlayEvent ストリームも、1本の色付きティッカーに織る」。
 * EventBus を購読し、あらゆるイベント種別を1行の流れる表示に変換する汎用ビューア。
 * OSS価値: このモノレポの"共通言語"(PlayEvent)を可視化する土台。他の全アプリのデバッグにも効く。
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
