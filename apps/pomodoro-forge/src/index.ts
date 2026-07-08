import type { PlayEvent } from "@toygarden/contracts";
import type { Device } from "@toygarden/core-device";
import { MOTIFS, type Motif } from "@toygarden/core-chiptune";

/**
 * pomodoro-forge — 合体もの（git-observe + chiptune + device を app 層で束ねる実証）。
 * 25分集中で「鉱石(ore)」が育ち、git.commit で「精錬」して ingot になる。
 * 完了時に deploy 成功ファンファーレを鳴らす。3 core が contracts 経由で疎結合に繋がる例。
 */

export const FOCUS_MS = 25 * 60 * 1000;
const ORE_STAGES = 10;

export interface ForgeState {
  elapsedMs: number;
  ore: number;
  ingots: number;
  done: boolean;
}

export function initForge(): ForgeState {
  return { elapsedMs: 0, ore: 0, ingots: 0, done: false };
}

/** 時間経過で ore が育つ（25分で満タン=10）。 */
export function tick(state: ForgeState, deltaMs: number): ForgeState {
  const elapsedMs = state.elapsedMs + deltaMs;
  const ore = Math.min(ORE_STAGES, Math.floor(elapsedMs / (FOCUS_MS / ORE_STAGES)));
  return { ...state, elapsedMs, ore, done: elapsedMs >= FOCUS_MS };
}

/** git.commit で ore を ingot に精錬（core-git-observe 由来のイベント）。 */
export function applyEvent(state: ForgeState, e: PlayEvent): ForgeState {
  if (e.kind === "git.commit") {
    return { ...state, ore: 0, ingots: state.ingots + state.ore };
  }
  return state;
}

/** 完了時に鳴らすモチーフ（未完了は null）。app が core-chiptune.play に渡す。 */
export function completionMotif(state: ForgeState): Motif | null {
  return state.done ? MOTIFS.deploySuccess : null;
}

export function draw(device: Device, state: ForgeState): void {
  device.draw({ op: "clear" });
  device.draw({ op: "text", x: 8, y: 8, text: `ore ${"#".repeat(state.ore)}` });
  device.draw({ op: "text", x: 8, y: 32, text: `ingots:${state.ingots}` });
  if (state.done) device.led({ r: 255, g: 180, b: 0 });
  device.flush();
}
