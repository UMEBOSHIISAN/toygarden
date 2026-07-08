import type { Lane, LaneItem } from "@toygarden/core-tui";
import { renderLanes } from "@toygarden/core-tui";

/**
 * secretary-today — secretary-tui 拡張の "today lane"。
 * UME_SOUL 優先順位（投稿→発送→データ→経理→開発）を縦レーンで並べ、
 * 止まっているもの(blocked)を赤で見せる。core-tui の純ロジックに乗るだけ。
 */

export const PRIORITY = ["投稿", "発送", "データ", "経理", "開発"] as const;
export type LaneKey = (typeof PRIORITY)[number];
export type TodayState = Partial<Record<LaneKey, LaneItem[]>>;

export function buildLanes(state: TodayState): Lane[] {
  return PRIORITY.map((key) => ({ title: key, items: state[key] ?? [] }));
}

export function render(state: TodayState): string {
  return renderLanes(buildLanes(state));
}

export function blockedCount(state: TodayState): number {
  return Object.values(state)
    .flat()
    .filter((i): i is LaneItem => !!i && i.status === "blocked").length;
}
