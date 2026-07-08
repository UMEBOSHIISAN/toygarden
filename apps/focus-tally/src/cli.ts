import { readFocusRows, toFocusEvents, DEFAULT_FOCUS_DB } from "@toygarden/core-focus-log";
import { barChart } from "./index.ts";
import { synthEvents } from "./demo.ts";

/**
 * focus-tally 実行エントリ。focus-cam の sqlite ログを読み、活動ごとの棒グラフを1回だけ描く。
 *   node dist/tally.mjs                     → 既定パス（~/.focus-log/events.sqlite）
 *   node dist/tally.mjs --db <path> --limit 100
 * DB が無い/読めない場合は合成データにフォールバックし、demo data と明示した上でライブ表示を続ける。
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const argv = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const dbPath = opt("--db", DEFAULT_FOCUS_DB);
const limit = Number(opt("--limit", "200"));

let events;
try {
  const rows = await readFocusRows(dbPath, limit);
  events = toFocusEvents(rows);
} catch {
  events = undefined;
}

if (events !== undefined) {
  if (events.length === 0) {
    process.stdout.write("記録がありません。\n");
    process.exit(0);
  }
  process.stdout.write(`\n  ${CYAN}~ focus tally ~${RESET}  ${DIM}なにに じかんを つかったか${RESET}\n`);
  process.stdout.write(barChart(events) + "\n");
  process.exit(0);
}

// 実データ源が見つからない（DB 未作成/読めない）→ 合成データでライブ表示を続ける。
const demoEvents = synthEvents(Math.random, 34);
let revealed = 1;
process.stdout.write(HIDE);
const done = (): void => {
  process.stdout.write(SHOW + "\n");
  process.exit(0);
};
process.on("SIGINT", done);
process.on("SIGTERM", done);
setInterval(() => {
  const header = `\n  ${CYAN}~ focus tally ~${RESET}  ${DIM}なにに じかんを つかったか（demo data）${RESET}\n`;
  process.stdout.write(CLEAR + header + barChart(demoEvents.slice(0, revealed)) + "\n");
  revealed = revealed >= demoEvents.length ? 1 : revealed + 1;
}, 500);
