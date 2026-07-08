import type { Device, RGB } from "@toygarden/core-device";
import { renderPCM, encodeWav, type Motif } from "@toygarden/core-chiptune";

/**
 * chiptune-clock （chiptune × device）
 * → 「時刻を 8bit で告げる時計」。毎正時に "時の数" だけ鐘のモチーフを鳴らし、パネルに時刻表示。
 * OSS価値: M5/ターミナルの常駐チップチューン置時計。
 */

/** hour(0-23) → 12時間制の鐘の数だけ音を並べたモチーフ。 */
export function chimeFor(hour: number): Motif {
  const strikes = ((((hour % 12) + 11) % 12) + 1); // 0時/12時=12, 1時=1 ...
  const notes = Array.from({ length: strikes }, (_, i) => ({
    note: i % 2 === 0 ? "C5" : "G4",
    ms: 160,
  }));
  return { notes };
}

export function chimeWav(hour: number): Uint8Array {
  return encodeWav(renderPCM(chimeFor(hour)));
}

const DIGIT_COLOR: RGB = { r: 255, g: 255, b: 255 };
const COLON_COLOR: RGB = { r: 0, g: 200, b: 220 };
const BAR_BG: RGB = { r: 60, g: 60, b: 60 };
const BAR_COLOR: RGB = { r: 0, g: 200, b: 220 };

/** 7セグ風の点灯パターン（a=top,b=topright,c=bottomright,d=bottom,e=bottomleft,f=topleft,g=middle）。 */
interface Segments {
  a: boolean;
  b: boolean;
  c: boolean;
  d: boolean;
  e: boolean;
  f: boolean;
  g: boolean;
}

const SEGMENTS: Record<string, Segments> = {
  "0": { a: true, b: true, c: true, d: true, e: true, f: true, g: false },
  "1": { a: false, b: true, c: true, d: false, e: false, f: false, g: false },
  "2": { a: true, b: true, c: false, d: true, e: true, f: false, g: true },
  "3": { a: true, b: true, c: true, d: true, e: false, f: false, g: true },
  "4": { a: false, b: true, c: true, d: false, e: false, f: true, g: true },
  "5": { a: true, b: false, c: true, d: true, e: false, f: true, g: true },
  "6": { a: true, b: false, c: true, d: true, e: true, f: true, g: true },
  "7": { a: true, b: true, c: true, d: false, e: false, f: false, g: false },
  "8": { a: true, b: true, c: true, d: true, e: true, f: true, g: true },
  "9": { a: true, b: true, c: true, d: true, e: false, f: true, g: true },
};

/**
 * 1桁を rect の集合で描く（7セグ風・最大5 rect: top/middle/bottom/left/right）。
 * left は f(左上)・e(左下) を、right は b(右上)・c(右下) を1本に統合するので
 * どの数字でも rect 数は5を超えない。
 */
function drawDigit(device: Device, digit: string, x: number, y: number, w: number, h: number): void {
  const seg = SEGMENTS[digit];
  if (!seg) return;
  const t = Math.max(2, Math.round(w * 0.22));
  const half = Math.round(h / 2);

  if (seg.a) device.draw({ op: "rect", x, y, w, h: t, color: DIGIT_COLOR });
  if (seg.d) device.draw({ op: "rect", x, y: y + h - t, w, h: t, color: DIGIT_COLOR });
  if (seg.g) device.draw({ op: "rect", x, y: y + Math.round(h / 2 - t / 2), w, h: t, color: DIGIT_COLOR });

  if (seg.f && seg.e) {
    device.draw({ op: "rect", x, y, w: t, h, color: DIGIT_COLOR });
  } else if (seg.f) {
    device.draw({ op: "rect", x, y, w: t, h: half, color: DIGIT_COLOR });
  } else if (seg.e) {
    device.draw({ op: "rect", x, y: y + half, w: t, h: half, color: DIGIT_COLOR });
  }

  if (seg.b && seg.c) {
    device.draw({ op: "rect", x: x + w - t, y, w: t, h, color: DIGIT_COLOR });
  } else if (seg.b) {
    device.draw({ op: "rect", x: x + w - t, y, w: t, h: half, color: DIGIT_COLOR });
  } else if (seg.c) {
    device.draw({ op: "rect", x: x + w - t, y: y + half, w: t, h: half, color: DIGIT_COLOR });
  }
}

/**
 * パネルに大きな7セグ風の時刻 + 秒の進行バーを描く。
 * colonOn でコロンを点滅させる（cli の1秒トグルと連動）。
 */
export function drawClock(
  device: Device,
  hour: number,
  minute: number,
  second = 0,
  colonOn = true,
): void {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const { width, height } = device.panelSize();

  device.draw({ op: "clear" });

  const digitW = Math.round(width * 0.13);
  const digitH = Math.round(height * 0.42);
  const gap = Math.max(3, Math.round(width * 0.02));
  const colonW = Math.max(4, Math.round(width * 0.02));
  const totalW = digitW * 4 + gap * 4 + colonW;
  let x = Math.round((width - totalW) / 2);
  const y = Math.round(height * 0.14);

  for (const d of hh) {
    drawDigit(device, d, x, y, digitW, digitH);
    x += digitW + gap;
  }
  if (colonOn) {
    const dot = Math.max(3, colonW);
    device.draw({ op: "rect", x, y: y + Math.round(digitH * 0.28), w: dot, h: dot, color: COLON_COLOR });
    device.draw({ op: "rect", x, y: y + Math.round(digitH * 0.62), w: dot, h: dot, color: COLON_COLOR });
  }
  x += colonW + gap;
  for (const d of mm) {
    drawDigit(device, d, x, y, digitW, digitH);
    x += digitW + gap;
  }

  // 秒の進行バー（00〜59 で満ちる）
  const barY = Math.round(height * 0.86);
  const barX = Math.round(width * 0.08);
  const barW = width - barX * 2;
  device.draw({ op: "rect", x: barX, y: barY, w: barW, h: 5, color: BAR_BG });
  const filled = Math.max(0, Math.min(barW, Math.round((second / 60) * barW)));
  if (filled > 0) device.draw({ op: "rect", x: barX, y: barY, w: filled, h: 5, color: BAR_COLOR });

  device.flush();
}
