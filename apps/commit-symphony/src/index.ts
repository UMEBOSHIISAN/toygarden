import type { GitCommit } from "@umeplay/core-git-observe";
import { renderPCM, encodeWav, type Motif, type Note } from "@umeplay/core-chiptune";

/**
 * commit-symphony （git-observe × chiptune）
 * → 「git log を 8bit の曲に変える」。
 * 追加行数で音の高さ、削除行数で音の長さ、Co-Authored-By: Claude は1オクターブ上の音色。
 * OSS価値: 任意のリポジトリの歴史を耳で聴ける sonifier。
 */

const SCALE = ["C4", "D4", "E4", "G4", "A4", "C5"];

function upOctave(n: string): string {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return n;
  return `${m[1]}${Number(m[2]) + 1}`;
}

export function commitsToMotif(commits: GitCommit[]): Motif {
  const notes: Note[] = [...commits].reverse().map((c) => {
    const idx = Math.min(SCALE.length - 1, Math.floor(Math.log2(c.added + 1)));
    const base = SCALE[idx];
    return {
      note: c.coauthoredByClaude ? upOctave(base) : base,
      ms: 120 + Math.min(c.removed * 8, 300),
    };
  });
  return { notes };
}

/** リポジトリの履歴 → WAV バイト列（そのまま鳴らせる曲）。 */
export function commitsToWav(commits: GitCommit[]): Uint8Array {
  return encodeWav(renderPCM(commitsToMotif(commits)));
}
