import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import { commitsSince } from "@umeplay/core-git-observe";
import { noteToFreq } from "@umeplay/core-chiptune";
import { commitsToMotif, commitsToWav } from "./index.ts";

/**
 * commit-symphony 実行エントリ。git 履歴を 8bit の曲(WAV)に変換して書き出す。
 *   node dist/symphony.mjs                        → カレント repo → commit-symphony.wav
 *   node dist/symphony.mjs --repo <path> --count 30 --out song.wav
 */

const argv = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const repo = opt("--repo", process.cwd());
const count = Number(opt("--count", "20"));
const out = opt("--out", "commit-symphony.wav");

const commits = commitsSince(repo, count);
if (commits.length === 0) {
  process.stdout.write("コミットがありません。\n");
  process.exit(0);
}

const motif = commitsToMotif(commits);
const wav = commitsToWav(commits);
writeFileSync(out, wav);

// ピッチ輪郭のスパークライン
const BARS = "▁▂▃▄▅▆▇█";
const freqs = motif.notes.map((n) => noteToFreq(n.note));
const lo = Math.min(...freqs);
const hi = Math.max(...freqs);
const spark = motif.notes
  .map((n) => {
    const t = hi > lo ? (noteToFreq(n.note) - lo) / (hi - lo) : 0.5;
    return BARS[Math.round(t * (BARS.length - 1))];
  })
  .join("");

const rev = [...commits].reverse();
process.stdout.write(`\n♪ commit-symphony  ${basename(repo)}  (${commits.length} commits → ${motif.notes.length} notes)\n`);
process.stdout.write(`  pitch: ${spark}\n\n`);
motif.notes.forEach((n, i) => {
  const c = rev[i];
  const line = `  ${String(i + 1).padStart(3)}  ${n.note.padEnd(3)} ${String(n.ms).padStart(3)}ms   +${c.added} -${c.removed}${c.coauthoredByClaude ? "  [AI]" : ""}`;
  process.stdout.write(line + "\n");
});
const secs = (motif.notes.reduce((s, n) => s + n.ms, 0) / 1000).toFixed(1);
process.stdout.write(`\n→ ${out}  (${(wav.length / 1024).toFixed(1)}KB, ${secs}s)\n`);
