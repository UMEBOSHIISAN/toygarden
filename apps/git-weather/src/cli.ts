import { basename } from "node:path";
import { commitsSince, type GitCommit } from "@toygarden/core-git-observe";
import { selectDevice } from "@toygarden/core-device";
import { draw } from "./index.ts";
import { renderScreen } from "./demo.ts";

/**
 * git-weather 実行エントリ。実リポジトリの直近コミット履歴を天気のタイムラプスで再生する。
 *   node dist/git-weather.mjs                       → カレント repo をタイムラプス再生
 *   node dist/git-weather.mjs --repo <path> --count 30
 *   node dist/git-weather.mjs --once                → 直近状態を1枚だけ出力（スクリプト向け）
 *
 * TOYGARDEN_DEVICE=m5 npm run play git-weather で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const WINDOW = 6;

const argv = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const repo = opt("--repo", process.cwd());
const count = Number(opt("--count", "20"));
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
const windows: GitCommit[][] = rev.map((_, idx) => rev.slice(Math.max(0, idx - WINDOW + 1), idx + 1));

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

if (once) {
  draw(device, windows[windows.length - 1]);
  process.stdout.write(renderScreen(windows[windows.length - 1], label, 0) + "\n");
} else {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  let i = 0;
  const timer = setInterval(() => {
    draw(device, windows[i]);
    process.stdout.write(CLEAR + renderScreen(windows[i], label, i) + "\n");
    i++;
    if (i >= windows.length) {
      clearInterval(timer);
      setTimeout(done, 1800);
    }
  }, 260);
}
