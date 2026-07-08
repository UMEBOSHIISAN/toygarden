/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 合成コミット列を commitsToMotif() に通し、ノートが1つずつ「鳴っていく」ピアノロール風の進行画面にする。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import { seeded } from "@toygarden/core-termgif";
import type { GitCommit } from "@toygarden/core-git-observe";
import { noteToFreq } from "@toygarden/core-chiptune";
import { commitsToMotif } from "./index.ts";

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";
const LEVELS = " ░▒▓█"; // 5段階の音高スパーク（許可済みブロック文字のみ）

/** seeded rng で合成コミット列を作る（新しい順・index 0 が最新）。 */
function synthCommits(rnd: () => number, n: number): GitCommit[] {
  const authors = ["umeboshi", "codex"];
  const out: GitCommit[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      hash: (0x2000000 + i * 137).toString(16),
      author: authors[Math.floor(rnd() * authors.length)],
      added: 1 + Math.floor(rnd() * 24),
      removed: Math.floor(rnd() * 10),
      coauthoredByClaude: rnd() < 0.4,
    });
  }
  return out;
}

export function demo(): DemoSpec {
  const rnd = seeded(2601);
  const commits = synthCommits(rnd, 18);
  const motif = commitsToMotif(commits); // 実ロジック：追加行数=音高、AI共著=1オクターブ上
  const freqs = motif.notes.map((n) => noteToFreq(n.note));
  const lo = Math.min(...freqs);
  const hi = Math.max(...freqs);
  const sparkChar = (freq: number): string => {
    const t = hi > lo ? (freq - lo) / (hi - lo) : 0.5;
    return LEVELS[Math.round(t * (LEVELS.length - 1))];
  };
  const rev = [...commits].reverse(); // motif.notes と同じ並び（古い順）

  const WINDOW = 8; // 直近8ノートだけを表示（縦を22行以内に収める）
  const frames: string[] = [];
  for (let revealed = 1; revealed <= motif.notes.length; revealed++) {
    const spark = motif.notes
      .map((_, i) => (i < revealed ? YELLOW + sparkChar(freqs[i]) + RESET : DIM + "." + RESET))
      .join("");
    const start = Math.max(0, revealed - WINDOW);
    const rows = motif.notes.slice(start, revealed).map((n, k) => {
      const idx = start + k;
      const c = rev[idx];
      const cur = idx === revealed - 1 ? GREEN + "→" + RESET : " ";
      const ai = c.coauthoredByClaude ? DIM + "[AI]" + RESET : "    ";
      return `  ${cur} ${n.note.padEnd(3)} ${String(n.ms).padStart(3)}ms ${ai} +${c.added} -${c.removed}`;
    });
    const header = `  ${CYAN}~ commit-symphony ~${RESET}  ${DIM}git log becomes an 8-bit tune${RESET}`;
    const pitch = `  pitch ${spark}`;
    frames.push([header, pitch, ...rows].join("\n"));
  }
  // 曲の完成を数フレーム保持
  for (let i = 0; i < 6; i++) frames.push(frames[frames.length - 1]);

  return {
    name: "commit-symphony",
    fps: 6,
    frames,
    uses: ["core-git-observe", "core-chiptune"],
    tagline: "Your git history becomes an 8-bit tune; AI co-authored commits ring an octave up.",
  };
}
