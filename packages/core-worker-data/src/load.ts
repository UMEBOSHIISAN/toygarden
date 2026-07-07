import { readFileSync } from "node:fs";
import { parseRoutingLedger, parseCollapseStats } from "./parse.js";

/** ローカルファイルから routing trials を読む（read-only・mutation なし）。 */
export function loadRoutingTrials(path: string) {
  return parseRoutingLedger(readFileSync(path, "utf8"));
}

/** ローカルファイルから collapse 統計を読む（read-only）。 */
export function loadCollapseStats(path: string) {
  return parseCollapseStats(readFileSync(path, "utf8"));
}
