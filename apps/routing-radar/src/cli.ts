import { loadRoutingTrials } from "@toygarden/core-worker-data";
import { radar } from "./index.ts";
import { FINAL } from "./demo.ts";

/**
 * routing-radar 実行エントリ。routing_trial_ledger（TSV）を読み、confidence バーを1回だけ描く。
 *   node dist/radar.mjs --file <routing_trial_ledger.tsv>
 *   node dist/radar.mjs                     → --file 未指定時は合成データでライブ表示を続ける
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const argv = process.argv.slice(2);
const fi = argv.indexOf("--file");
const path = fi >= 0 ? argv[fi + 1] : undefined;

if (path) {
  let trials;
  try {
    trials = loadRoutingTrials(path);
  } catch {
    process.stderr.write(`ledger を読めませんでした: ${path}\n`);
    process.exit(1);
  }

  if (trials.length === 0) {
    process.stdout.write("記録がありません。\n");
    process.exit(0);
  }

  process.stdout.write(`\n  ${CYAN}~ routing radar ~${RESET}  ${DIM}どの worker に振ると当たるか${RESET}\n`);
  process.stdout.write(radar(trials) + "\n");
  process.exit(0);
}

// --file 未指定＝実データ源なし → 合成データでライブ表示を続ける。
process.stdout.write(HIDE);
const done = (): void => {
  process.stdout.write(SHOW + "\n");
  process.exit(0);
};
process.on("SIGINT", done);
process.on("SIGTERM", done);
setInterval(() => {
  const header = `\n  ${CYAN}~ routing radar ~${RESET}  ${DIM}どの worker に振ると当たるか（demo data）${RESET}\n`;
  process.stdout.write(CLEAR + header + radar(FINAL) + "\n");
}, 500);
