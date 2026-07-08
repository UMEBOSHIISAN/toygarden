import { activityTally, type FocusEvent } from "@toygarden/core-focus-log";
import { color, GREEN, YELLOW } from "@toygarden/core-tui";

/**
 * focus-tally （focus-log × tui）
 * → 「今日は何に時間を使ったか、を端末の棒グラフに」。focus-cam の activity 集計を横棒に描く。
 * OSS価値: sqlite の集計をゼロ依存で端末チャート化する最小 data-viz。
 */

export function barChart(events: FocusEvent[], width = 20): string {
  const tally = activityTally(events);
  const max = Math.max(1, ...tally.map((t) => t.count));
  const rows = tally.map((t) => {
    const len = Math.round((t.count / max) * width);
    return `  ${color(GREEN, "█".repeat(len).padEnd(width))} ${String(t.count).padStart(3)}  ${t.activity}`;
  });
  return [color(YELLOW, "▍ focus tally"), ...rows].join("\n");
}
