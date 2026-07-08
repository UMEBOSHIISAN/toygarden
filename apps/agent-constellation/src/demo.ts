/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * dispatch が走るたびに星座線が伸び、collapse すると星が赤く灯る様子を見せる。
 * `npm run gifs` が拾って demo/gifs/agent-constellation.gif を再生成する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import type { PlayEvent, Agent } from "@umeplay/contracts";
import { initState, applyEvent, type ConstellationState, type Star } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";

const COLS = 52;
const ROWS = 10;
const DEV_W = 320;
const DEV_H = 240;

function toGrid(x: number, y: number): [number, number] {
  const gx = Math.max(0, Math.min(COLS - 1, Math.round((x / DEV_W) * (COLS - 1))));
  const gy = Math.max(0, Math.min(ROWS - 1, Math.round((y / DEV_H) * (ROWS - 1))));
  return [gx, gy];
}

/** 2点を単純な線形補間で結ぶ（ターミナル格子向けの簡易ライン描画）。 */
function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  const pts: [number, number][] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    pts.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t)]);
  }
  return pts;
}

/** 星座を1画面に描く。demo と cli の両方から呼ばれる共通レンダラ。 */
export function renderScreen(state: ConstellationState, hint = ""): string {
  const grid: string[][] = Array.from({ length: ROWS }, () => new Array<string>(COLS).fill(" "));
  const starPos = new Map<Agent, [number, number]>();
  for (const s of state.stars) starPos.set(s.agent, toGrid(s.x, s.y));

  for (const e of state.edges) {
    const a = starPos.get(e.from);
    const b = starPos.get(e.to);
    if (!a || !b) continue;
    for (const [px, py] of linePoints(a[0], a[1], b[0], b[1])) {
      if (grid[py][px] === " ") grid[py][px] = ".";
    }
  }
  for (const s of state.stars) {
    const [gx, gy] = starPos.get(s.agent)!;
    grid[gy][gx] = s.collapsed ? "*" : "☆";
  }

  const body = grid
    .map((row) =>
      row
        .map((ch) => {
          if (ch === "☆") return `${CYAN}☆${RESET}`;
          if (ch === "*") return `${RED}${BOLD}★${RESET}`;
          if (ch === ".") return `${DIM}.${RESET}`;
          return " ";
        })
        .join(""),
    )
    .join("\n");

  const legend = state.stars
    .map((s: Star) => {
      const mark = s.collapsed ? `${RED}★ collapsed${RESET}` : `${CYAN}☆${RESET}`;
      return `  ${s.agent.padEnd(6)} ${mark}`;
    })
    .join("  ");
  const header = `  ${CYAN}~ agent-constellation ~${RESET}  ${DIM}dispatch links the stars${hint}${RESET}`;
  return `${header}\n\n${body}\n\n${legend}`;
}

/** dispatch を1本ずつ足しながら星座を編み、最後に qwen を collapse させる合成イベント列。 */
export function demoStream(): PlayEvent[] {
  return [
    { kind: "agent.dispatch", from: "cc", to: "codex", task: "じっそう" },
    { kind: "agent.dispatch", from: "codex", to: "qwen", task: "ぶんるい" },
    { kind: "agent.dispatch", from: "qwen", to: "gemma", task: "しんさ" },
    { kind: "agent.dispatch", from: "gemma", to: "human", task: "しょうにん" },
    { kind: "agent.dispatch", from: "human", to: "cc", task: "つぎのNEXT" },
    { kind: "agent.collapse", agent: "qwen", rate: 0.3 },
  ];
}

export function demo(): DemoSpec {
  let state = initState();
  const stream = demoStream();
  const frames: string[] = [renderScreen(state), renderScreen(state)];
  for (const e of stream) {
    state = applyEvent(state, e);
    frames.push(renderScreen(state));
    frames.push(renderScreen(state));
    frames.push(renderScreen(state)); // 変化を見せるため数コマ保持
  }
  for (let hold = 0; hold < 6; hold++) frames.push(renderScreen(state));
  return {
    name: "agent-constellation",
    fps: 5,
    frames,
    uses: ["contracts", "core-device", "core-events"],
    tagline: "dispatch draws the line, collapse turns the star red",
  };
}
