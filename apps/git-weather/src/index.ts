import type { GitCommit } from "@toygarden/core-git-observe";
import type { Device, RGB } from "@toygarden/core-device";

/**
 * git-weather （git-observe × device）
 * → 「リポジトリの荒れ具合を天気で表す」。直近コミットの churn(追加+削除) で
 * 快晴〜嵐を判定し M5/Ajazz パネルにアイコン表示。
 * OSS価値: desk-weather の入力を "作業環境" から "リポジトリ" に差し替えた派生。
 */

export type Weather = "sunny" | "cloudy" | "rain" | "storm";

const ICON: Record<Weather, string> = { sunny: "SUN", cloudy: "CLD", rain: "RAIN", storm: "STORM" };

export function repoWeather(commits: GitCommit[]): Weather {
  const churn = commits.reduce((s, c) => s + c.added + c.removed, 0);
  if (churn === 0) return "sunny";
  if (churn < 50) return "cloudy";
  if (churn < 300) return "rain";
  return "storm";
}

const GRAY: RGB = { r: 170, g: 170, b: 170 };
const DARK_GRAY: RGB = { r: 90, g: 90, b: 90 };
const YELLOW: RGB = { r: 255, g: 210, b: 0 };
const BLUE: RGB = { r: 70, g: 140, b: 255 };
const BAR_BG: RGB = { r: 50, g: 50, b: 50 };
const STORM_BAR: RGB = { r: 255, g: 60, b: 60 };
const CHURN_MAX = 400; // demo.ts のゲージ上限に合わせる

/** 雲の形（3枚の重なり rect）。cloudy/rain/storm 共通の土台。 */
function drawCloud(device: Device, x: number, y: number, color: RGB): void {
  device.draw({ op: "rect", x: x + 2, y: y + 8, w: 26, h: 12, color });
  device.draw({ op: "rect", x, y: y + 14, w: 34, h: 10, color });
  device.draw({ op: "rect", x: x + 10, y: y + 2, w: 16, h: 12, color });
}

/** 天気アイコンを rect ドット絵で描く（desk-weather と同一意匠）。 */
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

export function draw(device: Device, commits: GitCommit[]): void {
  const w = repoWeather(commits);
  const churn = commits.reduce((s, c) => s + c.added + c.removed, 0);
  const { width, height } = device.panelSize();
  device.draw({ op: "clear" });

  const iconX = Math.round(width * 0.03);
  const iconY = Math.round(height * 0.06);
  drawWeatherIcon(device, w, iconX, iconY);

  const labelX = iconX + 46;
  device.draw({ op: "text", x: labelX, y: iconY + 6, text: ICON[w] });
  device.draw({ op: "text", x: labelX, y: iconY + 22, text: `churn:${churn}` });

  const barY = Math.round(height * 0.7);
  const barX = Math.round(width * 0.06);
  const barW = width - barX * 2;
  device.draw({ op: "rect", x: barX, y: barY, w: barW, h: 10, color: BAR_BG });
  const filled = Math.max(0, Math.min(barW, Math.round((churn / CHURN_MAX) * barW)));
  if (filled > 0) {
    const barColor = w === "storm" ? STORM_BAR : w === "rain" ? BLUE : GRAY;
    device.draw({ op: "rect", x: barX, y: barY, w: filled, h: 10, color: barColor });
  }

  device.led(w === "storm" ? { r: 255, g: 0, b: 0 } : { r: 0, g: 200, b: 0 });
  device.flush();
}
