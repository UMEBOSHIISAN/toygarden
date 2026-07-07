import { RED, GREEN, YELLOW, DIM, color } from "./ansi.js";

export type Status = "ok" | "blocked" | "idle";

export interface LaneItem {
  label: string;
  status: Status;
}
export interface Lane {
  title: string;
  items: LaneItem[];
}

const MARK: Record<Status, string> = {
  ok: color(GREEN, "●"), // ●
  blocked: color(RED, "●"),
  idle: color(DIM, "○"), // ○
};

/**
 * 縦レーンを文字列に（設計 secretary-today）。UME_SOUL 優先順位の可視化に使う。
 * 止まっている(blocked)ものが赤く出る。純関数（テスト可能）。
 */
export function renderLanes(lanes: Lane[]): string {
  return lanes
    .map((lane) => {
      const head = color(YELLOW, `▍ ${lane.title}`); // ▍
      const body = lane.items
        .map((it) => `  ${MARK[it.status]} ${it.label}`)
        .join("\n");
      return body ? `${head}\n${body}` : head;
    })
    .join("\n\n");
}

/** 未処理件数バッジ（0は淡色・1以上は赤）。 */
export function badge(count: number): string {
  return count > 0 ? color(RED, `(${count})`) : color(DIM, "(0)");
}
