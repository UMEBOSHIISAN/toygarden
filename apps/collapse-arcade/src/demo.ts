/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/collapse-arcade.gif を再生成する。
 * collapse-frontier の崩壊統計を実際に spawn/shoot に通し、撃墜の様子をそのまま描く。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import { spawn, shoot, type ArcadeState } from "./index.ts";
import type { CollapseStat } from "@umeplay/core-worker-data";
import { renderBattle, renderClear, type EnemyView } from "./view.ts";

// collapse-frontier 由来の崩壊率データ（形は CollapseStat 実物と同じ）
const STATS: CollapseStat[] = [
  { agent: "codex", rate: 0.18 },
  { agent: "qwen", rate: 0.12 },
  { agent: "gemma", rate: 0.09 },
  { agent: "cc", rate: 0.07 },
];

// 全滅させるまでの射撃順（同一敵を hp が尽きるまで狙い続ける）
const SHOT_ORDER = ["codex", "codex", "qwen", "qwen", "gemma", "cc"];

export function demo(): DemoSpec {
  let arcade: ArcadeState = spawn(STATS, 0.05);
  const rows: EnemyView[] = arcade.enemies.map((e) => ({ agent: e.agent, hp: e.hp, maxHp: e.hp }));
  const idxOf = (agent: string): number => rows.findIndex((r) => r.agent === agent);

  const frames: string[] = [];
  // イントロ: 敵編隊が現れる
  frames.push(renderBattle(rows, -1, "idle", arcade.score));
  frames.push(renderBattle(rows, -1, "idle", arcade.score));

  for (const agent of SHOT_ORDER) {
    const i = idxOf(agent);
    frames.push(renderBattle(rows, i, "rise", arcade.score));
    arcade = shoot(arcade, agent); // 実際の shoot() を叩く
    const stillAlive = arcade.enemies.find((e) => e.agent === agent);
    rows[i] = { ...rows[i], hp: stillAlive ? stillAlive.hp : 0 };
    frames.push(renderBattle(rows, i, "hit", arcade.score));
    frames.push(renderBattle(rows, i, "settle", arcade.score));
  }

  for (let k = 0; k < 4; k++) frames.push(renderClear(arcade.score, rows.length));

  return {
    name: "collapse-arcade",
    fps: 6,
    frames,
    uses: ["core-worker-data"],
    tagline: "崩壊率の高いエージェントを撃墜するシューティング。撃つ＝レビュー",
  };
}
