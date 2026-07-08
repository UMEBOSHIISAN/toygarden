/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 合成 FocusEvent 列を1件ずつ積み上げながら barChart() を呼び直し、棒が伸びていく様子を再現する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import { seeded } from "@umeplay/core-termgif";
import type { FocusEvent } from "@umeplay/core-focus-log";
import { barChart } from "./index.ts";

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// デモ用の活動名（EN 表記のみ。実データは実際の focus-cam ログの activity 文字列がそのまま入る）
const ACTIVITIES = ["at the PC", "thinking", "on break", "in a meeting", "posting work"];

/** 合成 FocusEvent 列。demo() と cli.ts のフォールバック描画の両方から使う共通ジェネレータ。 */
export function synthEvents(rnd: () => number, n: number): FocusEvent[] {
  const weights = [0.35, 0.6, 0.75, 0.9, 1]; // 累積確率（活動ごとの出現しやすさ）
  const out: FocusEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    const pick = weights.findIndex((w) => r < w);
    out.push({
      id: i,
      at: 1_783_200_000_000 + i * 60_000,
      activity: ACTIVITIES[pick < 0 ? ACTIVITIES.length - 1 : pick],
      hasPhoto: rnd() < 0.6,
    });
  }
  return out;
}

export function demo(): DemoSpec {
  const rnd = seeded(714);
  const events = synthEvents(rnd, 34);
  const frames: string[] = [];
  for (let revealed = 1; revealed <= events.length; revealed++) {
    const header = `  ${CYAN}~ focus tally ~${RESET}  ${DIM}where did the time go${RESET}`;
    frames.push(header + "\n" + barChart(events.slice(0, revealed)));
  }
  for (let i = 0; i < 6; i++) frames.push(frames[frames.length - 1]);
  return {
    name: "focus-tally",
    fps: 6,
    frames,
    uses: ["core-focus-log", "core-tui"],
    tagline: "What you did today stacks up as a terminal bar chart.",
  };
}
