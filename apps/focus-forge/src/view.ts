/**
 * view.ts — focus-forge の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * 文字は ASCII + ひらがな + 罫線/ブロック/指定記号のみ。
 * activity の生文字列（作業ログ由来で漢字を含む）はそのまま描画せず、呼び出し側が渡す
 * ひらがなキャプションだけを表示する（フォント収録範囲を守るため）。
 */
import type { Forge } from "./index.ts";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

export const HEADER = `  ${CYAN}~ focus-forge ~${RESET}  ${DIM}forge ore with real, measured focus${RESET}`;

/** work=true なら ● (作業ティック)、false なら idle の一言。 */
export function renderForge(f: Forge, caption: string, work: boolean, harvestFlash: boolean): string {
  const oreColor = harvestFlash ? YELLOW + BOLD : work ? GREEN : DIM;
  const tickMark = work ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  const lines = [
    HEADER,
    "",
    `  ${tickMark}  ${caption}`,
    "",
    `  ore     ${oreColor}${"●".repeat(f.ore)}${DIM}${"░".repeat(Math.max(0, 6 - f.ore))}${RESET}  (${f.ore})`,
    `  ingots  ${GREEN}${"◆".repeat(Math.min(f.ingots, 20))}${RESET}  (${f.ingots})`,
    "",
    harvestFlash ? `  ${YELLOW}${BOLD}forged !${RESET}` : "",
  ];
  return lines.join("\n");
}
