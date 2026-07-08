import type { PlayEvent } from "@toygarden/contracts";
import type { Device, RGB } from "@toygarden/core-device";
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

const ORE_COLOR: RGB = { r: 160, g: 120, b: 90 };
const ORE_BG: RGB = { r: 40, g: 40, b: 40 };
const FORGE_BODY: RGB = { r: 40, g: 40, b: 40 };
const FLAME_GROW: RGB = { r: 255, g: 120, b: 0 };
const FLAME_DONE: RGB = { r: 255, g: 60, b: 0 };
const INGOT_COLOR: RGB = { r: 255, g: 210, b: 60 };
const MAX_INGOT_DOTS = 12;

export function draw(device: Device, state: ForgeState): void {
  const { width, height } = device.panelSize();
  device.draw({ op: "clear" });

  // ore ゲージ（上段バー、10段階満タンで精錬対象）
  const gaugeX = Math.round(width * 0.06);
  const gaugeY = Math.round(height * 0.08);
  const gaugeW = width - gaugeX * 2;
  device.draw({ op: "text", x: gaugeX, y: gaugeY, text: "ORE" });
  const barY = gaugeY + 14;
  device.draw({ op: "rect", x: gaugeX, y: barY, w: gaugeW, h: 10, color: ORE_BG });
  const oreW = Math.round((state.ore / ORE_STAGES) * gaugeW);
  if (oreW > 0) device.draw({ op: "rect", x: gaugeX, y: barY, w: oreW, h: 10, color: ORE_COLOR });

  // 炉（ore が育つほど炎が高くなる。state 由来なので commit 直後は 0 に戻り沈む）
  const forgeX = gaugeX;
  const forgeY = Math.round(height * 0.42);
  const forgeW = Math.round(width * 0.24);
  const forgeH = Math.round(height * 0.4);
  device.draw({ op: "rect", x: forgeX, y: forgeY, w: forgeW, h: forgeH, color: FORGE_BODY });
  if (state.ore > 0) {
    const flameH = Math.max(2, Math.round((state.ore / ORE_STAGES) * forgeH));
    const flameColor = state.done ? FLAME_DONE : FLAME_GROW;
    device.draw({
      op: "rect",
      x: forgeX + 4,
      y: forgeY + forgeH - flameH,
      w: forgeW - 8,
      h: flameH,
      color: flameColor,
    });
  }

  // ingots（精錬済み。右側に積み上げドット・上限は帯域保護のため12個）
  const ingotX = Math.round(width * 0.36);
  device.draw({ op: "text", x: ingotX, y: gaugeY, text: `INGOTS:${state.ingots}` });
  const perRow = Math.max(1, Math.floor((width - ingotX - 6) / 10));
  const shown = Math.min(state.ingots, MAX_INGOT_DOTS);
  for (let i = 0; i < shown; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    device.draw({ op: "rect", x: ingotX + col * 10, y: forgeY + row * 10, w: 6, h: 6, color: INGOT_COLOR });
  }

  if (state.done) device.led({ r: 255, g: 180, b: 0 });
  device.flush();
}
