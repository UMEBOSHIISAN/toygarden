import type { Device } from "@umeplay/core-device";

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

export function draw(device: Device, m: Metrics): void {
  const w = weatherFor(m);
  device.draw({ op: "clear" });
  device.draw({ op: "text", x: 10, y: 10, text: ICON[w] });
  device.draw({ op: "text", x: 10, y: 40, text: `dirty:${m.dirtyFiles} fail:${m.testFailures}` });
  device.led(w === "storm" ? { r: 255, g: 0, b: 0 } : { r: 0, g: 200, b: 0 });
  device.flush();
}
