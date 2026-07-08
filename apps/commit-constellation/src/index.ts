import type { GitCommit } from "@toygarden/core-git-observe";
import type { Device, RGB } from "@toygarden/core-device";

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

const STAR_COLORS: RGB[] = [
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 210, b: 80 },
  { r: 120, g: 200, b: 255 },
  { r: 255, g: 120, b: 200 },
];
const BAR_BG: RGB = { r: 40, g: 40, b: 40 };
const MAX_ROWS = 6;

export function draw(device: Device, commits: GitCommit[]): void {
  const stars = authorStars(commits).slice(0, MAX_ROWS);
  const max = Math.max(1, ...stars.map((s) => s.weight));
  const { width, height } = device.panelSize();
  device.draw({ op: "clear" });

  const rowH = Math.max(14, Math.round((height - 8) / Math.max(1, stars.length)));
  const barX = Math.round(width * 0.42);
  const barW = Math.max(20, width - barX - 30);

  stars.forEach((s, i) => {
    const y = 4 + i * rowH;
    // 貢献量(weight)が明るさ=星の大きさになる。
    const size = Math.max(3, Math.round((s.weight / max) * 10) + 3);
    const color = STAR_COLORS[i % STAR_COLORS.length];
    device.draw({
      op: "rect",
      x: 6,
      y: y + Math.round(rowH / 2) - Math.round(size / 2),
      w: size,
      h: size,
      color,
    });
    device.draw({ op: "text", x: 20, y, text: s.author.slice(0, 10) });
    device.draw({ op: "rect", x: barX, y: y + 2, w: barW, h: 6, color: BAR_BG });
    const filled = Math.max(0, Math.min(barW, Math.round((s.weight / max) * barW)));
    if (filled > 0) device.draw({ op: "rect", x: barX, y: y + 2, w: filled, h: 6, color });
  });

  device.flush();
}
