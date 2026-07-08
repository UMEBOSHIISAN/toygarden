import { spawn, shoot, type ArcadeState } from "./index.ts";
import type { CollapseStat } from "@umeplay/core-worker-data";
import { renderBattle, renderClear, type EnemyView } from "./view.ts";

/**
 * collapse-arcade 実行エントリ。
 *   node dist/arcade.mjs             → ライブ（Ctrl+C で終了。撃墜し終えると再湧きしてループ）
 *   node dist/arcade.mjs --frames 20 → 20フレームで終了（キャプチャ用）
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const STATS: CollapseStat[] = [
  { agent: "codex", rate: 0.18 },
  { agent: "qwen", rate: 0.12 },
  { agent: "gemma", rate: 0.09 },
  { agent: "cc", rate: 0.07 },
];
const SHOT_ORDER = ["codex", "codex", "qwen", "qwen", "gemma", "cc"];

/** 湧いて → 撃墜し尽くして → クリア画面 → また湧く、を無限に繰り返す画面ジェネレータ。 */
function* play(): Generator<string> {
  for (;;) {
    let arcade: ArcadeState = spawn(STATS, 0.05);
    const rows: EnemyView[] = arcade.enemies.map((e) => ({ agent: e.agent, hp: e.hp, maxHp: e.hp }));
    const idxOf = (agent: string): number => rows.findIndex((r) => r.agent === agent);

    yield renderBattle(rows, -1, "idle", arcade.score);
    yield renderBattle(rows, -1, "idle", arcade.score);

    for (const agent of SHOT_ORDER) {
      const i = idxOf(agent);
      yield renderBattle(rows, i, "rise", arcade.score);
      arcade = shoot(arcade, agent);
      const stillAlive = arcade.enemies.find((e) => e.agent === agent);
      rows[i] = { ...rows[i], hp: stillAlive ? stillAlive.hp : 0 };
      yield renderBattle(rows, i, "hit", arcade.score);
      yield renderBattle(rows, i, "settle", arcade.score);
    }
    for (let k = 0; k < 4; k++) yield renderClear(arcade.score, rows.length);
  }
}

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount);
const gen = play();

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(() => {
    process.stdout.write(CLEAR + gen.next().value + "\n");
  }, 220);
} else {
  for (let k = 0; k < frameCount; k++) {
    process.stdout.write(gen.next().value + "\n\n");
  }
}
