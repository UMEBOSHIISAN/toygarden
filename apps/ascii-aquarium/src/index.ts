import type { PlayEvent } from "@umeplay/contracts";

/**
 * ascii-aquarium — ターミナル常駐の ASCII 水槽（secretary-tui スクリーンセーバー枠）。
 * 魚＝泳ぐ何か、餌やり＝task.done で魚が増える。純ロジック（描画は文字列）。
 */

export interface Fish {
  id: number;
  x: number;
  size: number;
}
export interface Aquarium {
  width: number;
  fish: Fish[];
}

export function initAquarium(width = 40, count = 3): Aquarium {
  return {
    width,
    fish: Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i * 7) % width,
      size: 1,
    })),
  };
}

/** 1ステップ進める（魚が右へ泳ぐ・端で折り返し）。 */
export function step(a: Aquarium): Aquarium {
  return { ...a, fish: a.fish.map((f) => ({ ...f, x: (f.x + 1) % a.width })) };
}

/** 餌やり: task.done で新しい魚が湧く。 */
export function feed(a: Aquarium, e: PlayEvent): Aquarium {
  if (e.kind === "task.done") {
    return { ...a, fish: [...a.fish, { id: a.fish.length, x: 0, size: 1 }] };
  }
  return a;
}

export function render(a: Aquarium): string {
  const row = new Array<string>(a.width).fill(" ");
  for (const f of a.fish) row[f.x % a.width] = f.size > 1 ? ">" : "~";
  return `|${row.join("")}|`;
}
