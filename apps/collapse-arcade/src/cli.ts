import { spawn, shoot, type ArcadeState } from "./index.ts";
import type { CollapseStat } from "@umeplay/core-worker-data";
import { renderBattle, renderClear, type EnemyView } from "./view.ts";
import { loadBest, saveBest } from "./save.ts";

/**
 * collapse-arcade 実行エントリ。
 *   node dist/arcade.mjs             → ライブ（Ctrl+C で終了。撃墜し終えると再湧きしてループ）
 *   node dist/arcade.mjs --frames 20 → 20フレームで終了（キャプチャ用）
 *
 * 終了時のスコアをベストと比較し ~/.umeplay/save.json に記録する（RPGセーブ風）。
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

const STATS: CollapseStat[] = [
  { agent: "codex", rate: 0.18 },
  { agent: "qwen", rate: 0.12 },
  { agent: "gemma", rate: 0.09 },
  { agent: "cc", rate: 0.07 },
];
const SHOT_ORDER = ["codex", "codex", "qwen", "qwen", "gemma", "cc"];

interface Frame {
  text: string;
  score: number;
}

/** 湧いて → 撃墜し尽くして → クリア画面 → また湧く、を無限に繰り返す画面ジェネレータ。 */
function* play(): Generator<Frame> {
  for (;;) {
    let arcade: ArcadeState = spawn(STATS, 0.05);
    const rows: EnemyView[] = arcade.enemies.map((e) => ({ agent: e.agent, hp: e.hp, maxHp: e.hp }));
    const idxOf = (agent: string): number => rows.findIndex((r) => r.agent === agent);

    yield { text: renderBattle(rows, -1, "idle", arcade.score), score: arcade.score };
    yield { text: renderBattle(rows, -1, "idle", arcade.score), score: arcade.score };

    for (const agent of SHOT_ORDER) {
      const i = idxOf(agent);
      yield { text: renderBattle(rows, i, "rise", arcade.score), score: arcade.score };
      arcade = shoot(arcade, agent);
      const stillAlive = arcade.enemies.find((e) => e.agent === agent);
      rows[i] = { ...rows[i], hp: stillAlive ? stillAlive.hp : 0 };
      yield { text: renderBattle(rows, i, "hit", arcade.score), score: arcade.score };
      yield { text: renderBattle(rows, i, "settle", arcade.score), score: arcade.score };
    }
    for (let k = 0; k < 4; k++) yield { text: renderClear(arcade.score, rows.length), score: arcade.score };
  }
}

/** 終了時に「きろくポイント」演出を出し、ベストなら ~/.umeplay/save.json に保存する。 */
function reportRecord(score: number): void {
  const updated = saveBest(score);
  const best = loadBest();
  if (updated) console.log(`${YELLOW}${BOLD}* あたらしい きろく!${RESET}`);
  console.log(`${DIM}きろくポイント ✱ ${best}${RESET}  (今回: ${score})`);
}

const startBest = loadBest();
if (startBest > 0) console.log(`${DIM}きろく ✱ ${startBest}${RESET}`);

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount);
const gen = play();
let lastScore = 0;

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    reportRecord(lastScore);
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(() => {
    const frame = gen.next().value;
    lastScore = frame.score;
    process.stdout.write(CLEAR + frame.text + "\n");
  }, 220);
} else {
  for (let k = 0; k < frameCount; k++) {
    const frame = gen.next().value;
    lastScore = frame.score;
    process.stdout.write(frame.text + "\n\n");
  }
  reportRecord(lastScore);
}
