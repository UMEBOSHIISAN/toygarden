/**
 * view.ts — pomodoro-forge の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * 文字は ASCII + ひらがな + 罫線/ブロック/指定記号のみ。
 */
import { FOCUS_MS, type ForgeState } from "./index.ts";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const ORANGE = "\x1b[33m";

export const HEADER = `  ${CYAN}~ pomodoro-forge ~${RESET}  ${DIM}こうせき が そだち git.commit で せいれん${RESET}`;

function mmss(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function oreBar(ore: number): string {
  return "▓".repeat(ore) + "░".repeat(10 - ore);
}

/** 現在の ForgeState + 一言キャプションを1画面に描く。flash は精錬/完成の一瞬だけ true。 */
export function renderForge(state: ForgeState, caption: string, flash: boolean): string {
  const oreColor = flash ? YELLOW + BOLD : ORANGE;
  const lines = [
    HEADER,
    "",
    `  ore    [${oreColor}${oreBar(state.ore)}${RESET}]  ${state.ore}/10`,
    `  ingots  ${GREEN}${"◆".repeat(Math.min(state.ingots, 20))}${RESET}  (${state.ingots})`,
    "",
    `  time    ${mmss(state.elapsedMs)} / ${mmss(FOCUS_MS)}`,
    "",
    `  ${flash ? YELLOW + BOLD : DIM}${caption}${RESET}`,
  ];
  return lines.join("\n");
}

/** 25分満タン(done)の完成画面。 */
export function renderDone(state: ForgeState): string {
  const lines = [
    HEADER,
    "",
    `        ${YELLOW}${BOLD}♪♪♪ かんせい !! ♪♪♪${RESET}`,
    "",
    `        ${GREEN}ingots: ${"◆".repeat(Math.min(state.ingots, 20))}  (${state.ingots})${RESET}`,
    "",
    `        ${DIM}time ${mmss(state.elapsedMs)} で しゅうりょう${RESET}`,
  ];
  return lines.join("\n");
}
