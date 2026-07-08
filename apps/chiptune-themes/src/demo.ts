/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * イベント種別 → 音テーマを、音符の出現とピッチバーで可視化する。
 * `npm run gifs` が拾って demo/gifs/chiptune-themes.gif を再生成する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import type { PlayEvent } from "@umeplay/contracts";
import { noteToFreq } from "@umeplay/core-chiptune";
import { themeFor } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";

const LO_FREQ = noteToFreq("C3");
const HI_FREQ = noteToFreq("C6");
const BARS = " ░▒▓█";

function barFor(note: string): string {
  const t = Math.max(0, Math.min(1, (noteToFreq(note) - LO_FREQ) / (HI_FREQ - LO_FREQ)));
  return BARS[Math.round(t * (BARS.length - 1))];
}

export interface Scene {
  event: PlayEvent;
  jp: string; // ひらがなラベル
  color: string;
}

export const SCENES: Scene[] = [
  { event: { kind: "gate.pending", label: "たいき" }, jp: "たいき", color: CYAN },
  { event: { kind: "agent.collapse", agent: "codex", rate: 0.3 }, jp: "はたん", color: RED },
  { event: { kind: "deploy.success" }, jp: "せいこう", color: GREEN },
  { event: { kind: "task.done", project: "とうこう" }, jp: "むおん", color: GRAY },
];

/** 1画面ぶんの描画。demo と cli の両方から呼ばれる共通レンダラ。hint は cli の操作説明用。 */
export function renderScreen(scene: Scene, revealed: number, hint = ""): string {
  const theme = themeFor(scene.event);
  const header = `  ${CYAN}~ chiptune-themes ~${RESET}  ${DIM}event → おと${hint}${RESET}`;
  const eventLine = `  event: ${BOLD}${scene.event.kind}${RESET}  [${scene.color}${scene.jp}${RESET}]`;
  if (!theme) {
    return `${header}\n\n${eventLine}\n\n  ${GRAY}(おと なし むおん)${RESET}\n\n  ${GRAY}...${RESET}`;
  }
  const notes = theme.motif.notes.slice(0, revealed);
  const pitch = notes.map((n) => scene.color + barFor(n.note) + RESET).join("") || " ";
  const names = notes.map((n) => n.note).join(" ");
  const marks = notes.map(() => `${scene.color}♪${RESET}`).join(" ") || DIM + "…" + RESET;
  return `${header}\n\n${eventLine}\n\n  pitch: ${pitch}\n  notes: ${names}\n\n  ${marks}`;
}

export function demo(): DemoSpec {
  const frames: string[] = [];
  for (const scene of SCENES) {
    const theme = themeFor(scene.event);
    const noteCount = theme ? theme.motif.notes.length : 0;
    const steps = Math.max(3, noteCount);
    for (let r = 1; r <= steps; r++) frames.push(renderScreen(scene, Math.min(r, noteCount)));
    for (let hold = 0; hold < 3; hold++) frames.push(renderScreen(scene, noteCount));
  }
  return {
    name: "chiptune-themes",
    fps: 6,
    frames,
    uses: ["core-chiptune", "core-events"],
    tagline: "gate待ち/collapse/deploy成功をそれぞれの音テーマで知らせる",
  };
}
