/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * dirty/fail/stale の推移を天気で見せる: はれ → くもり → あめ → あらし → 回復。
 * `npm run gifs` が拾って demo/gifs/desk-weather.gif を再生成する。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import { weatherFor, score, type Metrics, type Weather } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BLUE = "\x1b[34m";
const RED = "\x1b[31m";
const WHITE = "\x1b[37m";

const ICON: Record<Weather, readonly string[]> = {
  sunny: ["    \\  |  /    ", "   -- (○) --   ", "    /  |  \\    "],
  cloudy: ["    .------.    ", "  (          )  ", " (____________) "],
  rain: [" (____________) ", "  '  '  '  '  ' ", "   '  '  '  '   "],
  storm: [" (____________) ", "    \\    /      ", "     \\  /  ★   "],
};

const COLOR: Record<Weather, string> = { sunny: YELLOW, cloudy: WHITE, rain: BLUE, storm: RED };
const LABEL: Record<Weather, string> = { sunny: "sunny", cloudy: "cloudy", rain: "rain", storm: "storm" };

function bar(n: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((n / max) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** 1画面ぶんの描画。demo と cli の両方から呼ばれる共通レンダラ。 */
export function renderScreen(m: Metrics, tick: number): string {
  const w = weatherFor(m);
  const c = COLOR[w];
  const flicker = w === "storm" && tick % 2 === 0;
  const header = `  ${CYAN}~ desk-weather ~${RESET}  ${DIM}a weather gauge for your workspace${RESET}`;
  const icon = ICON[w].map((l) => c + (flicker ? l.replace("★", " ") : l) + RESET).join("\n");
  const label = `        ${BOLD}${c}${LABEL[w]}${RESET}  ${DIM}score:${score(m)}${RESET}`;
  const gauges = [
    `  dirty  ${bar(m.dirtyFiles, 10, 16)} ${String(m.dirtyFiles).padStart(2)}`,
    `  fail   ${bar(m.testFailures, 5, 16)} ${String(m.testFailures).padStart(2)}`,
    `  stale  ${bar(m.staleMemory, 10, 16)} ${String(m.staleMemory).padStart(2)}`,
  ].join("\n");
  return `${header}\n\n${icon}\n${label}\n\n${gauges}`;
}

/** 32フレームの合成メトリクス推移: 快晴 → 悪化 → 嵐 → 一部回復。 */
function metricsAt(i: number): Metrics {
  if (i < 6) return { dirtyFiles: 0, testFailures: 0, staleMemory: 0 };
  if (i < 12) return { dirtyFiles: Math.min(3, i - 5), testFailures: 0, staleMemory: 0 };
  if (i < 20) {
    return { dirtyFiles: 3 + (i - 12), testFailures: i >= 16 ? 1 : 0, staleMemory: Math.min(2, i - 17) };
  }
  if (i < 28) return { dirtyFiles: 10, testFailures: Math.min(4, i - 19), staleMemory: 3 };
  return { dirtyFiles: 4, testFailures: 1, staleMemory: 1 };
}

export function demo(): DemoSpec {
  const frames: string[] = [];
  for (let i = 0; i < 32; i++) frames.push(renderScreen(metricsAt(i), i));
  return {
    name: "desk-weather",
    fps: 6,
    frames,
    uses: ["core-device"],
    tagline: "Your repo's health becomes desk weather; a dirty tree clouds over.",
  };
}
