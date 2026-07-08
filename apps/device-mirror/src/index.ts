import type { Device, DrawCommand, PanelSize, RGB } from "@umeplay/core-device";
import type { PlayEvent } from "@umeplay/contracts";

/**
 * device-mirror — 実機を買う前に、実機が見える。
 * core-device(HAL) の MockDevice に発行される DrawCommand / led() / onButton を、
 * ターミナル上の仮想 M5Stack 風ガジェット（液晶+A/B/Cボタン+LED）へリアルタイムでミラーする。
 * app はハードを知らず Device しか見ない、という HAL の意味を一目で分かる形にするための道具。
 */

const CHAR_W = 8; // 液晶ピクセル → 文字セルの変換単位（core-termgif の 8x8 フォントに合わせた横幅）
const CHAR_H = 16; // 縦は横の2倍（ターミナル文字のアスペクト比に合わせて1行あたり2セル分とる）
const LOG_LINES = 3; // 画面下部に出す「直近の DrawCommand」ログの行数

export const BUTTON_LABELS = ["A", "B", "C"] as const;

export interface MirrorState {
  readonly panel: PanelSize;
  readonly cell: { readonly cols: number; readonly rows: number };
  readonly grid: readonly string[]; // rows 行 x cols 文字（空白パディング済み）
  readonly led: RGB | null;
  readonly log: readonly string[]; // 直近 LOG_LINES 件（古い→新しい順）
  readonly lastButton: number | null;
}

/** パネル解像度(px) → 文字グリッドの行数・列数。app は解像度を直書きせず必ずここ経由。 */
export function cellGrid(panel: PanelSize): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.floor(panel.width / CHAR_W)),
    rows: Math.max(1, Math.floor(panel.height / CHAR_H)),
  };
}

function blankGrid(cell: { cols: number; rows: number }): string[] {
  return Array.from({ length: cell.rows }, () => " ".repeat(cell.cols));
}

export function initMirror(panel: PanelSize): MirrorState {
  const cell = cellGrid(panel);
  return { panel, cell, grid: blankGrid(cell), led: null, log: [], lastButton: null };
}

/** DrawCommand を1行の説明にする（ログ表示用）。 */
export function describeCommand(cmd: DrawCommand): string {
  switch (cmd.op) {
    case "clear":
      return "clear";
    case "text":
      return `text(${cmd.x},${cmd.y}) "${cmd.text}"`;
    case "rect":
      return cmd.color
        ? `rect(${cmd.x},${cmd.y},${cmd.w}x${cmd.h}) rgb(${cmd.color.r},${cmd.color.g},${cmd.color.b})`
        : `rect(${cmd.x},${cmd.y},${cmd.w}x${cmd.h})`;
  }
}

function pushLog(log: readonly string[], line: string): string[] {
  return [...log, line].slice(-LOG_LINES);
}

/** 1つの DrawCommand を文字グリッドへ純粋に反映する。 */
export function applyDraw(state: MirrorState, cmd: DrawCommand): MirrorState {
  const log = pushLog(state.log, describeCommand(cmd));

  if (cmd.op === "clear") {
    return { ...state, grid: blankGrid(state.cell), log };
  }

  const grid = state.grid.slice();

  if (cmd.op === "text") {
    const row = Math.floor(cmd.y / CHAR_H);
    const colStart = Math.floor(cmd.x / CHAR_W);
    if (row >= 0 && row < grid.length) {
      const chars = [...grid[row]];
      for (let i = 0; i < cmd.text.length; i++) {
        const c = colStart + i;
        if (c >= 0 && c < chars.length) chars[c] = cmd.text[i];
      }
      grid[row] = chars.join("");
    }
  } else {
    const rowStart = Math.max(0, Math.floor(cmd.y / CHAR_H));
    const rowEnd = Math.min(grid.length, Math.ceil((cmd.y + cmd.h) / CHAR_H));
    const colStart = Math.max(0, Math.floor(cmd.x / CHAR_W));
    const colEnd = Math.min(state.cell.cols, Math.ceil((cmd.x + cmd.w) / CHAR_W));
    for (let r = rowStart; r < rowEnd; r++) {
      const chars = [...grid[r]];
      for (let c = colStart; c < colEnd; c++) chars[c] = "#";
      grid[r] = chars.join("");
    }
  }

  return { ...state, grid, log };
}

export function applyLed(state: MirrorState, color: RGB): MirrorState {
  return { ...state, led: color, log: pushLog(state.log, `led(${color.r},${color.g},${color.b})`) };
}

export function applyButton(state: MirrorState, button: number): MirrorState {
  const label = BUTTON_LABELS[button] ?? `#${button}`;
  return { ...state, lastButton: button, log: pushLog(state.log, `button ${label}`) };
}

/** ボタンの押下ハイライトだけを消す（発光を演出的にオフにする用途。ログには残さない）。 */
export function releaseButton(state: MirrorState): MirrorState {
  return state.lastButton === null ? state : { ...state, lastButton: null };
}

export interface MirroredDevice extends Device {
  /** 現在のミラー状態のスナップショット。 */
  snapshot(): MirrorState;
  /** ボタンの押下ハイライトを解除する（release 用）。 */
  release(): void;
}

/**
 * 任意の Device をラップし、draw() / led() / onButton() で流れる内容を MirrorState として
 * 追跡する decorator。app 側からは元の Device とまったく同じ形（Device インターフェース）に見える。
 */
export function mirror(device: Device): MirroredDevice {
  let state = initMirror(device.panelSize());

  // 外部から onButton で登録されるか否かに関わらず、押下は必ずミラー状態へ反映する。
  device.onButton((button) => {
    state = applyButton(state, button);
  });

  return {
    id: device.id,
    panelSize: () => device.panelSize(),
    draw(cmd) {
      device.draw(cmd);
      state = applyDraw(state, cmd);
    },
    onButton: (handler) => device.onButton(handler),
    led(color) {
      device.led(color);
      state = applyLed(state, color);
    },
    flush() {
      device.flush();
    },
    snapshot: () => state,
    release() {
      state = releaseButton(state);
    },
  };
}

// --- PlayEvent → 画面表示（デモ/CLI 共通で使う純関数） -----------------------

/** イベント種別を液晶に出す短いラベルへ変換。 */
export function labelFor(e: PlayEvent): string {
  switch (e.kind) {
    case "task.done":
      return `DONE ${e.project}`;
    case "gate.pending":
      return `WAIT ${e.label}`;
    case "deploy.success":
      return "DEPLOY OK";
    case "agent.dispatch":
      return `${e.from}->${e.to}`;
    case "agent.collapse":
      return `COLLAPSE ${e.agent}`;
    case "git.commit":
      return `commit +${e.added}/-${e.removed}`;
    case "worker.route":
      return `route:${e.worker}`;
    case "focus.activity":
      return `focus:${e.activity}`;
    case "sys.pulse":
      return `CPU ${Math.round(e.busyness * 100)}%`;
  }
}

/** イベント種別を LED 色へ変換（deploy成功=緑 / 承認待ち=黄 / 崩壊=赤 / それ以外=青）。 */
export function ledFor(e: PlayEvent): RGB {
  switch (e.kind) {
    case "deploy.success":
      return { r: 0, g: 220, b: 0 };
    case "gate.pending":
      return { r: 220, g: 180, b: 0 };
    case "agent.collapse":
      return { r: 220, g: 0, b: 0 };
    default:
      return { r: 0, g: 120, b: 220 };
  }
}
