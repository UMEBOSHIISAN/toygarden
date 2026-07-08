/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * リポジトリの著者を星座にし、寄与量(churn)が増えるほど星が明るく大きく育つ様子を見せる。
 * `npm run gifs` が拾って demo/gifs/commit-constellation.gif を再生成する。
 */
import { seeded, type DemoSpec } from "@umeplay/core-termgif";
import type { GitCommit } from "@umeplay/core-git-observe";
import { authorStars, type AuthorStar } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const MAGENTA = "\x1b[35m";

const AUTHOR_COLOR: Record<string, string> = { human: GREEN, codex: CYAN, cc: MAGENTA };

function starGlyph(weight: number, max: number): string {
  if (weight <= 0) return ".";
  return weight >= max * 0.66 ? "★" : weight >= max * 0.33 ? "☆" : "+";
}

function bar(n: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((n / Math.max(1, max)) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** 著者ごとの星座を1画面に描く。demo と cli の両方から呼ばれる共通レンダラ。 */
export function renderScreen(commits: GitCommit[], repoLabel: string): string {
  const stars: AuthorStar[] = authorStars(commits);
  const max = Math.max(1, ...stars.map((s) => s.weight));
  const header = `  ${CYAN}~ commit-constellation ~${RESET}  ${DIM}${repoLabel} の ひとを ほしざにする${RESET}`;
  const rows = stars
    .map((s) => {
      const c = AUTHOR_COLOR[s.author] ?? YELLOW;
      const glyph = starGlyph(s.weight, max);
      return `  ${c}${glyph}${RESET} ${s.author.padEnd(8)} ${c}${bar(s.weight, max, 18)}${RESET} ${String(s.weight).padStart(5)}`;
    })
    .join("\n");
  const total = commits.length;
  return `${header}\n\n${rows}\n\n  ${DIM}commits:${total}${RESET}`;
}

/** 3人の著者がぽつぽつコミットを積む合成履歴。人間が細かく、codex が時々大きく。 */
function commitAt(i: number, rnd: () => number): GitCommit {
  const authors = ["human", "human", "codex", "human", "cc", "human", "codex"];
  const author = authors[i % authors.length];
  const base = author === "codex" ? 60 : author === "cc" ? 20 : 8;
  const total = Math.round(base + rnd() * base);
  const added = Math.round(total * 0.7);
  const removed = total - added;
  return { hash: `c${i}`, author, added, removed, coauthoredByClaude: author !== "human" };
}

export function demo(): DemoSpec {
  const rnd = seeded(303);
  const commits: GitCommit[] = [];
  const frames: string[] = [];
  for (let i = 0; i < 26; i++) {
    commits.push(commitAt(i, rnd));
    frames.push(renderScreen(commits, "umeplay"));
  }
  return {
    name: "commit-constellation",
    fps: 5,
    frames,
    uses: ["core-git-observe", "core-device"],
    tagline: "コントリビューターの重みを星の大きさで見せる",
  };
}
