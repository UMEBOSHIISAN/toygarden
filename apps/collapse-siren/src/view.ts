/**
 * view.ts — collapse-siren の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * 文字は ASCII + ひらがな + 罫線/ブロック/指定記号のみ。
 */
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

export const HEADER = `  ${CYAN}~ collapse-siren ~${RESET}  ${DIM}くずれりつ が あがると さいれん${RESET}`;

const BAR_W = 20;
const SCALE = 0.2; // この崩壊率でバーが満タン表示になる

function gaugeBar(rate: number, tripped: boolean): string {
  const filled = Math.max(0, Math.min(BAR_W, Math.round((rate / SCALE) * BAR_W)));
  const color = tripped ? RED : rate > 0.1 ? YELLOW : GREEN;
  return color + "█".repeat(filled) + DIM + "░".repeat(BAR_W - filled) + RESET;
}

export interface AgentRow {
  agent: string;
  rate: number;
}

/** 4エージェント分のゲージ + 直近トリップの警報を1画面に描く。 */
export function renderSiren(rows: AgentRow[], threshold: number, justTripped: string | null): string {
  const lines = [HEADER, ""];
  for (const r of rows) {
    const tripped = r.rate > threshold;
    const flashing = r.agent === justTripped;
    const pct = `${Math.round(r.rate * 100)}%`.padStart(4);
    const mark = tripped ? (flashing ? `${YELLOW}${BOLD}▲ けいかい!${RESET}` : `${RED}▲${RESET}`) : " ";
    const name = (tripped ? RED + BOLD : DIM) + r.agent.padEnd(6) + RESET;
    lines.push(`  ${name} [${gaugeBar(r.rate, tripped)}] ${pct}  ${mark}`);
  }
  lines.push("");
  lines.push(DIM + "─".repeat(56) + RESET);
  lines.push(`  ${DIM}threshold: ${Math.round(threshold * 100)}%${RESET}`);
  return lines.join("\n");
}
