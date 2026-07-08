/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/focus-forge.gif を再生成する。
 * 実際の forgeFromFocus() を「イベントの先頭からi件」で繰り返し叩き、
 * 時系列に沿った ore/ingots の推移をそのまま描く（sort は時刻順で安定なので prefix = 途中経過と一致）。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import type { FocusEvent } from "@toygarden/core-focus-log";
import { forgeFromFocus } from "./index.ts";
import { renderForge } from "./view.ts";

const BASE = 1_783_200_000_000;
// activity は実際の isWork() 判定に使われる生ログ（漢字ヒント一致が必要）。
// caption は画面表示専用のひらがな言い換え（activity はそのまま描画しない）。
const EVENTS: { activity: string; caption: string; work: boolean }[] = [
  { activity: "作業をしている", caption: "working", work: true },
  { activity: "書いていた", caption: "writing", work: true },
  { activity: "考え事をしていた", caption: "thinking", work: true },
  { activity: "休憩中", caption: "break", work: false },
  { activity: "見ていた", caption: "watching", work: true },
  { activity: "打っていた", caption: "typing", work: true },
  { activity: "読んでいた", caption: "reading", work: true },
  { activity: "散歩中", caption: "walking", work: false },
  { activity: "作業をしている", caption: "working", work: true },
];

export function demo(): DemoSpec {
  const focusEvents: FocusEvent[] = EVENTS.map((e, i) => ({
    id: i + 1,
    at: BASE + i * 60_000,
    activity: e.activity,
    hasPhoto: false,
  }));

  const frames: string[] = [];
  frames.push(renderForge({ ore: 0, ingots: 0 }, "measuring starts", false, false));
  let prevIngots = 0;
  for (let i = 0; i < focusEvents.length; i++) {
    const f = forgeFromFocus(focusEvents.slice(0, i + 1)); // 実際の forgeFromFocus() を叩く
    const harvestFlash = f.ingots > prevIngots;
    const reps = harvestFlash ? 4 : 2;
    for (let r = 0; r < reps; r++) frames.push(renderForge(f, EVENTS[i].caption, EVENTS[i].work, harvestFlash));
    prevIngots = f.ingots;
  }
  const final = forgeFromFocus(focusEvents);
  for (let k = 0; k < 4; k++) frames.push(renderForge(final, "that's it for today", false, false));

  return {
    name: "focus-forge",
    fps: 5,
    frames,
    uses: ["core-focus-log", "core-chiptune", "core-device"],
    tagline: "A pomodoro that isn't self-reported. Only measured focus swings the hammer.",
  };
}
