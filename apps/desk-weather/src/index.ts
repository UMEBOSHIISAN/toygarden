import type { Device, RGB } from "@toygarden/core-device";

/**
 * desk-weather — 作業環境の「天気計」。
 * dirty tree / test failure / stale memory の数を天気で表す（快晴〜嵐）。
 * ガードレール状態が一目で分かる。core-device(HAL) に描くので M5/Ajazz で表示可。
 */

export type Weather = "sunny" | "cloudy" | "rain" | "storm";

export interface Metrics {
  dirtyFiles: number;
  testFailures: number;
  staleMemory: number;
}

const ICON: Record<Weather, string> = {
  sunny: "SUN",
  cloudy: "CLD",
  rain: "RAIN",
  storm: "STORM",
};

/** テスト失敗は重み3（最も嵐に近い）。合計スコアで天気を決める。 */
export function score(m: Metrics): number {
  return m.dirtyFiles + m.testFailures * 3 + m.staleMemory;
}

export function weatherFor(m: Metrics): Weather {
  const s = score(m);
  if (s === 0) return "sunny";
  if (s <= 3) return "cloudy";
  if (s <= 8) return "rain";
  return "storm";
}

const GRAY: RGB = { r: 170, g: 170, b: 170 };
const DARK_GRAY: RGB = { r: 90, g: 90, b: 90 };
const YELLOW: RGB = { r: 255, g: 210, b: 0 };
const BLUE: RGB = { r: 70, g: 140, b: 255 };
const FAIL_COLOR: RGB = { r: 220, g: 70, b: 70 };
const BAR_BG: RGB = { r: 50, g: 50, b: 50 };

/** 雲の形（3枚の重なり rect）。cloudy/rain/storm 共通の土台。 */
function drawCloud(device: Device, x: number, y: number, color: RGB): void {
  device.draw({ op: "rect", x: x + 2, y: y + 8, w: 26, h: 12, color });
  device.draw({ op: "rect", x, y: y + 14, w: 34, h: 10, color });
  device.draw({ op: "rect", x: x + 10, y: y + 2, w: 16, h: 12, color });
}

/** 天気アイコンを rect ドット絵で描く（晴=日輪 / 曇=灰色雲 / 雨=青い縦線 / 嵐=雷）。 */
function drawWeatherIcon(device: Device, w: Weather, x: number, y: number): void {
  if (w === "sunny") {
    device.draw({ op: "rect", x: x + 10, y: y + 10, w: 16, h: 16, color: YELLOW });
    device.draw({ op: "rect", x: x + 14, y, w: 8, h: 6, color: YELLOW });
    device.draw({ op: "rect", x: x + 14, y: y + 30, w: 8, h: 6, color: YELLOW });
    device.draw({ op: "rect", x, y: y + 14, w: 6, h: 8, color: YELLOW });
    device.draw({ op: "rect", x: x + 30, y: y + 14, w: 6, h: 8, color: YELLOW });
    return;
  }
  if (w === "cloudy") {
    drawCloud(device, x, y, GRAY);
    return;
  }
  if (w === "rain") {
    drawCloud(device, x, y, GRAY);
    device.draw({ op: "rect", x: x + 4, y: y + 28, w: 3, h: 8, color: BLUE });
    device.draw({ op: "rect", x: x + 14, y: y + 30, w: 3, h: 8, color: BLUE });
    device.draw({ op: "rect", x: x + 24, y: y + 28, w: 3, h: 8, color: BLUE });
    return;
  }
  drawCloud(device, x, y, DARK_GRAY);
  device.draw({ op: "rect", x: x + 16, y: y + 26, w: 6, h: 8, color: YELLOW });
  device.draw({ op: "rect", x: x + 10, y: y + 32, w: 8, h: 6, color: YELLOW });
  device.draw({ op: "rect", x: x + 16, y: y + 36, w: 6, h: 8, color: YELLOW });
}

/** ラベル + track(rect) + fill(rect) + 数値のミニゲージ。 */
function drawGauge(
  device: Device,
  x: number,
  y: number,
  barW: number,
  label: string,
  value: number,
  max: number,
  color: RGB,
): void {
  device.draw({ op: "text", x, y, text: label });
  const trackX = x + 44;
  device.draw({ op: "rect", x: trackX, y, w: barW, h: 8, color: BAR_BG });
  const filled = Math.max(0, Math.min(barW, Math.round((value / max) * barW)));
  if (filled > 0) device.draw({ op: "rect", x: trackX, y, w: filled, h: 8, color });
  device.draw({ op: "text", x: trackX + barW + 4, y, text: String(value) });
}

export function draw(device: Device, m: Metrics): void {
  const w = weatherFor(m);
  const { width, height } = device.panelSize();
  device.draw({ op: "clear" });

  const iconX = Math.round(width * 0.03);
  const iconY = Math.round(height * 0.04);
  drawWeatherIcon(device, w, iconX, iconY);

  const labelX = iconX + 46;
  device.draw({ op: "text", x: labelX, y: iconY + 4, text: ICON[w] });
  device.draw({ op: "text", x: labelX, y: iconY + 18, text: `score:${score(m)}` });

  const barW = Math.max(30, width - labelX - 60);
  const gaugeY = Math.round(height * 0.56);
  const gap = Math.max(14, Math.round(height * 0.16));
  drawGauge(device, iconX, gaugeY, barW, "DRT", m.dirtyFiles, 10, GRAY);
  drawGauge(device, iconX, gaugeY + gap, barW, "FAIL", m.testFailures, 5, FAIL_COLOR);
  drawGauge(device, iconX, gaugeY + gap * 2, barW, "STL", m.staleMemory, 10, BLUE);

  device.led(w === "storm" ? { r: 255, g: 0, b: 0 } : { r: 0, g: 200, b: 0 });
  device.flush();
}
