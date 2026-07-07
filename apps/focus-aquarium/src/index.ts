import type { FocusEvent } from "@umeplay/core-focus-log";

/**
 * focus-aquarium （focus-log × ascii-aquarium の描画思想）
 * → 「一日の focus 記録を魚の群れにする」。各 focus イベント＝魚、活動の種類で魚種が変わる。
 * その日の過ごし方がそのまま水槽になる。
 * OSS価値: 個人ログを"眺めて楽しい"アンビエント可視化に変える。
 */

const FISH = ["><>", "><=>", ">°>"];

export interface Fish {
  activity: string;
  x: number;
  kind: number;
}

export function fishFromFocus(events: FocusEvent[], width = 40): Fish[] {
  return events.map((e, i) => ({
    activity: e.activity,
    x: (i * 5) % width,
    kind: e.activity.length % FISH.length,
  }));
}

export function render(events: FocusEvent[], width = 40): string {
  const row = new Array<string>(width).fill(" ");
  for (const f of fishFromFocus(events, width)) row[f.x] = FISH[f.kind][0];
  return `|${row.join("")}|`;
}
