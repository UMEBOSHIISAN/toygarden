import type { CollapseStat } from "@toygarden/core-worker-data";

/**
 * collapse-arcade — collapse-frontier の越権/崩壊データをシューティング化。
 * 崩壊率の高いエージェントが敵として出現、撃ち落とす＝レビュー。研究データが遊べる。
 */

export interface Enemy {
  agent: string;
  hp: number;
}
export interface ArcadeState {
  enemies: Enemy[];
  score: number;
}

/** 崩壊率が閾値超のエージェントを敵として湧かせる。hp は崩壊率に比例。 */
export function spawn(stats: CollapseStat[], threshold = 0.05): ArcadeState {
  const enemies = stats
    .filter((s) => s.rate > threshold)
    // 0.07*100=7.000000000000001 の浮動小数誤差で ceil が 8 になるのを防ぐため先に丸める
    .map((s) => ({ agent: s.agent, hp: Math.max(1, Math.ceil(Math.round(s.rate * 10000) / 100)) }));
  return { enemies, score: 0 };
}

/** 撃つ＝レビュー。hp を削り、倒したら加点。 */
export function shoot(state: ArcadeState, agent: string, power = 10): ArcadeState {
  const before = state.enemies.length;
  const enemies = state.enemies
    .map((e) => (e.agent === agent ? { ...e, hp: e.hp - power } : e))
    .filter((e) => e.hp > 0);
  const killed = before - enemies.length;
  return { enemies, score: state.score + killed * 100 };
}

export function cleared(state: ArcadeState): boolean {
  return state.enemies.length === 0;
}
