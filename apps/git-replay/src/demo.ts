/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 実 git 履歴の代わりに seeded な合成コミット列を使い、タイムラプス再生を再現する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import { seeded } from "@umeplay/core-termgif";
import type { GitCommit } from "@umeplay/core-git-observe";
import { renderScreen } from "./index.ts";

/** seeded rng で合成コミット列を作る（新しい順・index 0 が最新）。 */
function synthCommits(rnd: () => number, n: number): GitCommit[] {
  const authors = ["umeboshi", "codex", "claude"];
  const out: GitCommit[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      hash: (0x1000000 + i * 111).toString(16),
      author: authors[Math.floor(rnd() * authors.length)],
      added: 1 + Math.floor(rnd() * 14),
      removed: Math.floor(rnd() * 7),
      coauthoredByClaude: rnd() < 0.4,
    });
  }
  return out;
}

export function demo(): DemoSpec {
  const rnd = seeded(4110);
  const commits = synthCommits(rnd, 16);
  const frames: string[] = [];
  for (let revealed = 1; revealed <= commits.length; revealed++) {
    frames.push(renderScreen(commits, revealed, "umeplay"));
  }
  // 最終フレームを数枚保持（止め絵にならないよう保険）
  for (let i = 0; i < 6; i++) frames.push(frames[frames.length - 1]);
  return {
    name: "git-replay",
    fps: 6,
    frames,
    uses: ["core-git-observe", "core-tui"],
    tagline: "Time-lapse playback of a repo's history, human and AI color-coded.",
  };
}
