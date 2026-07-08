import type { PlayEvent, Agent } from "@toygarden/contracts";
import type { Device } from "@toygarden/core-device";

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

export function draw(device: Device, state: ConstellationState): void {
  device.draw({ op: "clear" });
  for (const edge of state.edges) {
    const a = state.stars.find((s) => s.agent === edge.from);
    const b = state.stars.find((s) => s.agent === edge.to);
    if (a && b) {
      device.draw({
        op: "rect",
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(a.x - b.x) || 1,
        h: Math.abs(a.y - b.y) || 1,
      });
    }
  }
  for (const s of state.stars) {
    device.draw({ op: "text", x: s.x, y: s.y, text: s.collapsed ? "*" : "." });
    if (s.collapsed) device.led({ r: 255, g: 0, b: 0 });
  }
  device.flush();
}
