/**
 * view.ts — device-mirror の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * ベゼル + 液晶グリッド + LED ドット + A/B/C ボタン + 直近ログ、の順で組む。
 */
import type { RGB } from "@toygarden/core-device";
import { BUTTON_LABELS, type MirrorState } from "./index.ts";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const YELLOW = "\x1b[33m";
const GRAY = "\x1b[90m";

// HEADER は demo.ts 経由で core-termgif の font8x8(漢字ゼロ収録)を通ってGIFへ焼かれるため、
// ASCII+ひらがなのみで書く（漢字は未収録グリフの塗りつぶしブロックへ化ける。banner.mjs の
// assertGlyph 事故と同種の罠。テストで hasGlyph の全数チェックあり）。
export const HEADER = `  ${CYAN}~ device-mirror ~${RESET}  ${DIM}see the gadget before you buy it${RESET}`;

// 8色 ANSI の代表色。led() に渡された RGB を一番近いものへ丸める（実機LEDの見え方の近似）。
const ANSI_COLORS: ReadonlyArray<{ code: string; rgb: RGB }> = [
  { code: "\x1b[31m", rgb: { r: 255, g: 0, b: 0 } },
  { code: "\x1b[32m", rgb: { r: 0, g: 255, b: 0 } },
  { code: "\x1b[34m", rgb: { r: 0, g: 0, b: 255 } },
  { code: "\x1b[33m", rgb: { r: 255, g: 255, b: 0 } },
  { code: "\x1b[36m", rgb: { r: 0, g: 255, b: 255 } },
  { code: "\x1b[35m", rgb: { r: 255, g: 0, b: 255 } },
  { code: "\x1b[37m", rgb: { r: 255, g: 255, b: 255 } },
];

function nearestAnsi(c: RGB): string {
  let best = ANSI_COLORS[0];
  let bestDist = Infinity;
  for (const entry of ANSI_COLORS) {
    const d = (c.r - entry.rgb.r) ** 2 + (c.g - entry.rgb.g) ** 2 + (c.b - entry.rgb.b) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return best.code;
}

function ledDot(led: RGB | null): string {
  return led ? `${nearestAnsi(led)}●${RESET}` : `${GRAY}●${RESET}`;
}

function buttonRow(pressed: number | null): string {
  return BUTTON_LABELS.map((label, i) =>
    i === pressed ? `${BOLD}${YELLOW}[${label}]${RESET}` : `${DIM}[${label}]${RESET}`,
  ).join("   ");
}

/** 1画面ぶんの筐体描画。demo と cli の両方から呼ばれる共通レンダラ。 */
export function renderGadget(state: MirrorState): string {
  const { grid, cell } = state;
  const top = "  ┌" + "─".repeat(cell.cols + 2) + "┐";
  const bottom = "  └" + "─".repeat(cell.cols + 2) + "┘";
  const bezel = [top, ...grid.map((line) => `  │ ${line} │`), bottom].join("\n");

  const status = `  LED ${ledDot(state.led)}   ${DIM}panel ${state.panel.width}x${state.panel.height}${RESET}`;
  const buttons = "      " + buttonRow(state.lastButton);
  const logLines =
    state.log.length > 0
      ? [`  ${DIM}recent:${RESET}`, ...state.log.map((l) => `    ${DIM}${l}${RESET}`)]
      : [`  ${DIM}recent: (none)${RESET}`];

  return [HEADER, "", status, bezel, "", buttons, "", ...logLines].join("\n");
}
