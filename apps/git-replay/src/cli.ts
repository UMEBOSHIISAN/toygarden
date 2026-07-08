import { basename } from "node:path";
import { commitsSince, type GitCommit } from "@toygarden/core-git-observe";
import { buildFrames, renderScreen } from "./index.ts";

/**
 * git-replay 実行エントリ。実リポジトリのコミット履歴をタイムラプス再生。
 *   node dist/replay.mjs                     → カレントの git repo をライブ再生
 *   node dist/replay.mjs --repo <path> --count 20
 *   node dist/replay.mjs --once              → 全フレームを一度に出力（キャプチャ用）
 */

const argv = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const repo = opt("--repo", process.cwd());
const count = Number(opt("--count", "15"));
const once = argv.includes("--once");

let commits: GitCommit[] = [];
try {
  commits = commitsSince(repo, count);
} catch {
  process.stderr.write(`git log に失敗しました。${repo} は git リポジトリですか？\n`);
  process.exit(1);
}
if (commits.length === 0) {
  process.stdout.write("コミットがありません。\n");
  process.exit(0);
}

const label = basename(repo);
const frames = buildFrames(commits);
const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

if (once) {
  process.stdout.write(renderScreen(commits, frames.length, label) + "\n");
} else {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  let revealed = 0;
  const timer = setInterval(() => {
    revealed++;
    process.stdout.write(CLEAR + renderScreen(commits, revealed, label) + "\n");
    if (revealed >= frames.length) {
      clearInterval(timer);
      setTimeout(done, 1800);
    }
  }, 260);
}
