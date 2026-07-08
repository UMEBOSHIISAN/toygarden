/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 時刻が正時をまたぐ瞬間に chimeFor(hour) の鐘が鳴る様子を、大きな7セグ風の数字と
 * 鳴った音符（♪）で見せる。`npm run gifs` が拾って demo/gifs/chiptune-clock.gif を再生成する。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import { chimeFor } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";

/** 5行 x 5桁の大きな数字フォント（0-9）。 */
const DIGIT: Record<string, readonly string[]> = {
  "0": [" ███ ", "█   █", "█   █", "█   █", " ███ "],
  "1": ["  █  ", " ██  ", "  █  ", "  █  ", " ███ "],
  "2": [" ███ ", "█   █", "   █ ", "  █  ", "█████"],
  "3": [" ███ ", "█   █", "  ██ ", "█   █", " ███ "],
  "4": ["█  █ ", "█  █ ", "█████", "   █ ", "   █ "],
  "5": ["█████", "█    ", "████ ", "    █", "████ "],
  "6": [" ███ ", "█    ", "████ ", "█   █", " ███ "],
  "7": ["█████", "    █", "   █ ", "  █  ", "  █  "],
  "8": [" ███ ", "█   █", " ███ ", "█   █", " ███ "],
  "9": [" ███ ", "█   █", " ████", "    █", " ███ "],
};
const COLON = (on: boolean): readonly string[] => ["     ", on ? "  █  " : "     ", "     ", on ? "  █  " : "     ", "     "];

export function bigClock(hh: string, mm: string, colonOn: boolean, color: string): string {
  const glyphs = [...hh].map((d) => DIGIT[d]).concat([COLON(colonOn)], [...mm].map((d) => DIGIT[d]));
  const rows: string[] = [];
  for (let r = 0; r < 5; r++) rows.push(color + glyphs.map((g) => g[r]).join(" ") + RESET);
  return rows.join("\n");
}

export function bell(strikes: number, rung: number): string {
  const top = "   ___   ";
  const body = ` (     ) `;
  const bot = "  \\___/  ";
  const notes = Array.from({ length: strikes }, (_, i) => (i < rung ? `${MAGENTA}♪${RESET}` : `${DIM}·${RESET}`)).join(" ");
  return `${DIM}${top}${RESET}\n${DIM}${body}${RESET}\n${DIM}${bot}${RESET}\n  ${notes}`;
}

export function demo(): DemoSpec {
  const frames: string[] = [];
  let hour = 2;
  let minute = 50;
  let strikesShown = 0;
  const strikes = chimeFor(3).notes.length; // 3時の鐘の数
  for (let i = 0; i < 26; i++) {
    const atChime = hour === 3 && minute === 0;
    if (atChime && strikesShown < strikes) strikesShown++;
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    const color = hour === 3 && minute <= 4 ? YELLOW : CYAN;
    const header = `  ${CYAN}~ chiptune-clock ~${RESET}  ${DIM}an 8-bit clock that tolls the hour${RESET}`;
    const clock = bigClock(hh, mm, i % 2 === 0, color);
    const chimeLabel = hour === 3 && minute <= 4
      ? `  ${YELLOW}${BOLD}bell ${strikesShown}/${strikes}${RESET}`
      : `  ${DIM}next bell at 3:00${RESET}`;
    frames.push(`${header}\n\n${clock}\n\n${bell(strikes, hour === 3 ? strikesShown : 0)}\n${chimeLabel}`);
    if (i < 10) {
      minute++;
      if (minute > 59) {
        minute = 0;
        hour = (hour + 1) % 24;
      }
    } else if (i >= 10 && i < 16) {
      // 鐘が鳴っている間は時刻を進めない（鳴動を見せる）
    } else {
      minute++;
      if (minute > 59) {
        minute = 0;
        hour = (hour + 1) % 24;
      }
    }
  }
  return {
    name: "chiptune-clock",
    fps: 6,
    frames,
    uses: ["core-chiptune", "core-device"],
    tagline: "A desk clock that tells the hour with an 8-bit bell.",
  };
}
