import type { GitCommit } from "@toygarden/core-git-observe";
import type { Device } from "@toygarden/core-device";

/**
 * commit-constellation （git-observe × device）
 * → 「リポジトリの著者たちを星座にする」。各 author を星、寄与量(churn)を明るさ(星の大きさ)に。
 * agent-constellation がエージェント同士だったのに対し、こちらは実リポジトリの人間/AI。
 * OSS価値: コントリビューターの重みを一目で見せる可視化。
 */

export interface AuthorStar {
  author: string;
  weight: number;
}

export function authorStars(commits: GitCommit[]): AuthorStar[] {
  const m = new Map<string, number>();
  for (const c of commits) m.set(c.author, (m.get(c.author) ?? 0) + c.added + c.removed);
  return [...m.entries()]
    .map(([author, weight]) => ({ author, weight }))
    .sort((a, b) => b.weight - a.weight);
}

const glyph = (weight: number, max: number): string => (weight > max * 0.5 ? "*" : weight > 0 ? "+" : ".");

export function draw(device: Device, commits: GitCommit[]): void {
  const stars = authorStars(commits);
  const max = Math.max(1, ...stars.map((s) => s.weight));
  device.draw({ op: "clear" });
  stars.forEach((s, i) => {
    device.draw({ op: "text", x: 10, y: 10 + i * 12, text: `${glyph(s.weight, max)} ${s.author} (${s.weight})` });
  });
  device.flush();
}
