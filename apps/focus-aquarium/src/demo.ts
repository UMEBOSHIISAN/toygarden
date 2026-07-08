/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 1日の focus 記録が届くたびに水槽の魚が増えていく様子を見せる。
 * `npm run gifs` が拾って demo/gifs/focus-aquarium.gif を再生成する。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import type { FocusEvent } from "@toygarden/core-focus-log";
import { activityTally } from "@toygarden/core-focus-log";
import { render } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";

const WIDTH = 48;
const ACTIVITY_COLOR: Record<string, string> = {
  "work": CYAN,
  "break": GREEN,
  "meeting": YELLOW,
  "focus": BLUE,
};

/** 魚の文字だけを彩色する（枠・空白はそのまま）。 */
function colorizeRow(row: string): string {
  let out = "";
  for (const ch of row) {
    if (ch === "<" || ch === ">" || ch === "=" || ch === "°") out += CYAN + ch + RESET;
    else out += ch;
  }
  return out;
}

/** 1画面ぶんの描画。demo と cli の両方から呼ばれる共通レンダラ。 */
export function renderScreen(events: FocusEvent[], hint = ""): string {
  const header = `  ${CYAN}~ focus-aquarium ~${RESET}  ${DIM}focus log becomes fish${hint}${RESET}`;
  const wave = "  " + BLUE + "~".repeat(WIDTH + 2) + RESET;
  const tank = "  " + colorizeRow(render(events, WIDTH));
  const floor = "  " + DIM + "_".repeat(WIDTH + 2) + RESET;
  const tally = activityTally(events).slice(0, 4);
  const legend = tally
    .map((t) => `  ${ACTIVITY_COLOR[t.activity] ?? DIM}●${RESET} ${t.activity.padEnd(8)} ${t.count}`)
    .join("\n");
  return `${header}\n\n${wave}\n${tank}\n${floor}\n\n${legend}`;
}

/** 1日ぶんの合成 focus ログ（しごと中心・ときどき休憩・かいぎ・しゅうちゅう）。 */
export function dayStream(base = 1_783_200_000_000): FocusEvent[] {
  const pattern = ["work", "work", "work", "break", "work", "meeting", "work", "focus"];
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    at: base + i * 15 * 60_000,
    activity: pattern[i % pattern.length],
    hasPhoto: i % 3 === 0,
  }));
}

export function demo(): DemoSpec {
  const all = dayStream();
  const frames: string[] = [];
  for (let i = 1; i <= all.length; i++) frames.push(renderScreen(all.slice(0, i)));
  for (let hold = 0; hold < 4; hold++) frames.push(renderScreen(all));
  return {
    name: "focus-aquarium",
    fps: 6,
    frames,
    uses: ["core-focus-log"],
    tagline: "A day's focus log swims out as a school of fish at night.",
  };
}
