import type { PlayEvent, Agent } from "@toygarden/contracts";
import type { Device, RGB } from "@toygarden/core-device";

/**
 * agent-constellation — m5-agent-stars 拡張。
 * エージェントを星として描画し、dispatch を星座線で、collapse を赤い星で見せる。
 * core-device(HAL) に描くので M5 / Ajazz / mock いずれでも動く。
 */

export interface Star {
  agent: Agent;
  x: number;
  y: number;
  collapsed: boolean;
}
export interface Edge {
  from: Agent;
  to: Agent;
}
export interface ConstellationState {
  stars: Star[];
  edges: Edge[];
}

const AGENTS: Agent[] = ["cc", "codex", "qwen", "gemma", "human"];

export function initState(width = 320, height = 240): ConstellationState {
  const stars = AGENTS.map((agent, i) => ({
    agent,
    x: Math.round((width / (AGENTS.length + 1)) * (i + 1)),
    y: Math.round(height / 2 + Math.sin(i) * 40),
    collapsed: false,
  }));
  return { stars, edges: [] };
}

export function applyEvent(
  state: ConstellationState,
  e: PlayEvent,
): ConstellationState {
  if (e.kind === "agent.dispatch") {
    return { ...state, edges: [...state.edges, { from: e.from, to: e.to }] };
  }
  if (e.kind === "agent.collapse") {
    return {
      ...state,
      stars: state.stars.map((s) =>
        s.agent === e.agent ? { ...s, collapsed: e.rate > 0.1 } : s,
      ),
    };
  }
  return state;
}

// initState() のデフォルト座標空間（cli.ts が引数なしで呼ぶ既定値と一致させる）。
// 実機パネルは座標空間が異なる（M5=240x135）ので、描画時に panelSize() へ再マップする。
const SOURCE_W = 320;
const SOURCE_H = 240;

const STAR_COLOR: RGB = { r: 255, g: 255, b: 255 };
const COLLAPSED_COLOR: RGB = { r: 255, g: 30, b: 30 };
const LINE_COLOR: RGB = { r: 90, g: 90, b: 150 };

const STAR_SIZE = 4;
const COLLAPSED_SIZE = 7;
const LINE_STEPS = 6;
const LINE_DOT = 2;

function toPanel(x: number, y: number, pw: number, ph: number): [number, number] {
  return [Math.round((x / SOURCE_W) * pw), Math.round((y / SOURCE_H) * ph)];
}

/** 2点間を細い rect の連打（点線）で結ぶ。星座線を「塗りつぶし矩形」ではなく線らしく見せる。 */
function drawLine(device: Device, ax: number, ay: number, bx: number, by: number): void {
  for (let i = 1; i < LINE_STEPS; i++) {
    const t = i / LINE_STEPS;
    const x = Math.round(ax + (bx - ax) * t);
    const y = Math.round(ay + (by - ay) * t);
    device.draw({ op: "rect", x: x - 1, y: y - 1, w: LINE_DOT, h: LINE_DOT, color: LINE_COLOR });
  }
}

export function draw(device: Device, state: ConstellationState): void {
  const { width, height } = device.panelSize();
  device.draw({ op: "clear" });

  const pos = new Map<Agent, [number, number]>();
  for (const s of state.stars) pos.set(s.agent, toPanel(s.x, s.y, width, height));

  for (const edge of state.edges) {
    const a = pos.get(edge.from);
    const b = pos.get(edge.to);
    if (a && b) drawLine(device, a[0], a[1], b[0], b[1]);
  }

  for (const s of state.stars) {
    const [sx, sy] = pos.get(s.agent)!;
    const size = s.collapsed ? COLLAPSED_SIZE : STAR_SIZE;
    const color = s.collapsed ? COLLAPSED_COLOR : STAR_COLOR;
    device.draw({
      op: "rect",
      x: sx - Math.round(size / 2),
      y: sy - Math.round(size / 2),
      w: size,
      h: size,
      color,
    });
    device.draw({ op: "text", x: sx - 8, y: sy + size + 2, text: s.agent.slice(0, 6) });
    if (s.collapsed) device.led({ r: 255, g: 0, b: 0 });
  }
  device.flush();
}
