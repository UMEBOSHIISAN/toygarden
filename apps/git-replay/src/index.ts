import type { GitCommit } from "@toygarden/core-git-observe";
import { GREEN, RED, DIM, YELLOW, color } from "@toygarden/core-tui";

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
    const who = c.coauthoredByClaude ? color(DIM, "[AI]   ") : "[human]";
    return `#${String(i + 1).padStart(3, " ")} ${c.hash.slice(0, 7)} ${who} ${green}${red}`;
  });
}

/** AI 共著コミットの割合（0..1）。人間 vs AI 寄与サマリ。 */
export function aiShare(commits: GitCommit[]): number {
  if (commits.length === 0) return 0;
  return commits.filter((c) => c.coauthoredByClaude).length / commits.length;
}

export interface Totals {
  count: number;
  added: number;
  removed: number;
}

export function totals(commits: GitCommit[]): Totals {
  return commits.reduce<Totals>(
    (t, c) => ({ count: t.count + 1, added: t.added + c.added, removed: t.removed + c.removed }),
    { count: 0, added: 0, removed: 0 },
  );
}

/**
 * タイムラプス画面を組む（ヘッダ＋古い順に revealed 件まで＋集計フッタ）。
 * revealed を増やしながら呼ぶとアニメーションになる。純関数（テスト可能）。
 */
export function renderScreen(commits: GitCommit[], revealed: number, repoLabel: string): string {
  const frames = buildFrames(commits);
  const n = Math.max(0, Math.min(revealed, frames.length));
  const shown = frames.slice(0, n);
  const shownCommits = [...commits].reverse().slice(0, n);
  const t = totals(shownCommits);
  const ai = Math.round(aiShare(shownCommits) * 100);

  const rule = color(DIM, "─".repeat(54));
  const head = color(YELLOW, `▍ git-replay  ${repoLabel}  (${frames.length} commits)`);
  const foot = `  commits ${t.count}   ${color(GREEN, `+${t.added}`)} ${color(RED, `-${t.removed}`)}   AI ${ai}%`;
  return [head, rule, ...shown, rule, foot].join("\n");
}
