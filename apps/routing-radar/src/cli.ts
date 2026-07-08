import { loadRoutingTrials } from "@umeplay/core-worker-data";
import { radar } from "./index.ts";

/**
 * routing-radar 実行エントリ。routing_trial_ledger（TSV）を読み、confidence バーを1回だけ描く。
 *   node dist/radar.mjs --file <routing_trial_ledger.tsv>
 */

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const argv = process.argv.slice(2);
const fi = argv.indexOf("--file");
const path = fi >= 0 ? argv[fi + 1] : undefined;

if (!path) {
  process.stderr.write("使い方: node dist/radar.mjs --file <routing_trial_ledger.tsv>\n");
  process.exit(1);
}

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
