/**
 * view.ts — routing-slot の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * 文字は ASCII + ひらがな + 罫線/ブロック/指定記号のみ。
 */
import type { RoutingTrial } from "@umeplay/core-worker-data";
import type { SpinResult } from "./index.ts";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const MAGENTA = "\x1b[35m";

export const HEADER = `  ${CYAN}~ routing-slot ~${RESET}  ${DIM}spin to pick the worker${RESET}`;

const REEL_W = 18;
const fit = (s: string): string => (s.length >= REEL_W ? s.slice(0, REEL_W) : s.padEnd(REEL_W, " "));

/** 回転中: 候補をぱらぱらとめくる残像フレーム（乱数はどれを見せるかだけに使う・当落には影響しない）。 */
export function renderSpinning(trials: RoutingTrial[], blurIdx: number): string {
  const t = trials[blurIdx % trials.length];
  const box = [
    `  ┌${"─".repeat(REEL_W)}┬${"─".repeat(REEL_W)}┬${"─".repeat(10)}┐`,
    `  │${DIM}${fit(t.taxonomy)}${RESET}│${DIM}${fit(t.predictedWorker)}${RESET}│${DIM}${" ??% ".padEnd(10)}${RESET}│`,
    `  └${"─".repeat(REEL_W)}┴${"─".repeat(REEL_W)}┴${"─".repeat(10)}┘`,
  ];
  return [HEADER, "", "        [ spinning ... ]", "", ...box, "", ""].join("\n");
}

/** 停止: spin() の結果をそのまま表示。jackpot は金色フラッシュ。 */
export function renderStopped(r: SpinResult, flash: boolean): string {
  const pct = `${(r.confidence * 100).toFixed(0)}%`;
  const rowColor = r.jackpot ? (flash ? YELLOW + BOLD : MAGENTA) : GREEN;
  const box = [
    `  ┌${"─".repeat(REEL_W)}┬${"─".repeat(REEL_W)}┬${"─".repeat(10)}┐`,
    `  │${rowColor}${fit(r.taxonomy)}${RESET}│${rowColor}${fit(r.worker)}${RESET}│${rowColor}${fit(pct)}${RESET}│`,
    `  └${"─".repeat(REEL_W)}┴${"─".repeat(REEL_W)}┴${"─".repeat(10)}┘`,
  ];
  const banner = r.jackpot
    ? `      ${YELLOW}${BOLD}★★★ JACKPOT !! ★★★${RESET}`
    : `      ${DIM}miss...spin again${RESET}`;
  return [HEADER, "", "        [   stopped   ]", "", ...box, "", banner].join("\n");
}
