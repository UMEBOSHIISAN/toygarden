import type { GitCommit } from "@umeplay/core-git-observe";
import type { Device } from "@umeplay/core-device";

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

export function draw(device: Device, commits: GitCommit[]): void {
  const w = repoWeather(commits);
  device.draw({ op: "clear" });
  device.draw({ op: "text", x: 10, y: 10, text: ICON[w] });
  device.led(w === "storm" ? { r: 255, g: 0, b: 0 } : { r: 0, g: 200, b: 0 });
  device.flush();
}
