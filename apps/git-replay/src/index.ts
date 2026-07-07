import type { GitCommit } from "@umeplay/core-git-observe";
import { GREEN, RED, DIM, color } from "@umeplay/core-tui";

/**
 * git-replay — git-vibes 拡張。
 * コミット履歴を古い順のフレーム列（タイムラプス）に。追加=緑 / 削除=赤 パーティクル、
 * Co-Authored-By: Claude を [AI] で色分け（人間 vs AI 寄与の可視化）。
 */

const BAR_MAX = 40;

export function buildFrames(commits: GitCommit[]): string[] {
  return [...commits].reverse().map((c, i) => {
    const green = color(GREEN, "+".repeat(Math.min(c.added, BAR_MAX)));
    const red = color(RED, "-".repeat(Math.min(c.removed, BAR_MAX)));
    const who = c.coauthoredByClaude ? color(DIM, "[AI]") : "[human]";
    return `#${String(i + 1).padStart(3, " ")} ${c.hash.slice(0, 7)} ${who} ${green}${red}`;
  });
}

/** AI 共著コミットの割合（0..1）。人間 vs AI 寄与サマリ。 */
export function aiShare(commits: GitCommit[]): number {
  if (commits.length === 0) return 0;
  return commits.filter((c) => c.coauthoredByClaude).length / commits.length;
}
