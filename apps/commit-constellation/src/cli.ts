import { basename } from "node:path";
import { commitsSince, type GitCommit } from "@umeplay/core-git-observe";
import { renderScreen } from "./demo.ts";

/**
 * commit-constellation 実行エントリ。実リポジトリの著者を星座として描く。
 *   node dist/commit-constellation.mjs                     → カレント repo をタイムラプス再生
 *   node dist/commit-constellation.mjs --repo <path> --count 30
 *   node dist/commit-constellation.mjs --once              → 最終状態を1枚だけ出力（スクリプト向け）
 */

const argv = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const repo = opt("--repo", process.cwd());
const count = Number(opt("--count", "30"));
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
const rev = [...commits].reverse(); // 古い→新しい

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

if (once) {
  process.stdout.write(renderScreen(commits, label) + "\n");
} else {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  let revealed = 1;
  const timer = setInterval(() => {
    process.stdout.write(CLEAR + renderScreen(rev.slice(0, revealed), label) + "\n");
    revealed++;
    if (revealed > rev.length) {
      clearInterval(timer);
      setTimeout(done, 1800);
    }
  }, 220);
}
