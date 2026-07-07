import { describe, it, expect } from "vitest";
import type { GitCommit } from "../packages/core-git-observe/src/index.js";
import { render as renderToday } from "../apps/secretary-today/src/index.js";
import { initPet, applyEvent as applyPet, face } from "../apps/ume-tamagotchi/src/index.js";
import { initAquarium, step, feed, render as renderTank } from "../apps/ascii-aquarium/src/index.js";
import { buildFrames } from "../apps/git-replay/src/index.js";
import { weatherFor } from "../apps/desk-weather/src/index.js";
import { spin, reel } from "../apps/routing-slot/src/index.js";
import { spawn } from "../apps/collapse-arcade/src/index.js";

const ESC = String.fromCharCode(27);
const strip = (s: string): string => s.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "");

/** 各アプリの実レンダリングを1枚に集約して出力（出来上がり確認用）。 */
function showcase(): string {
  const out: string[] = [];

  out.push("== secretary-today ==");
  out.push(
    strip(
      renderToday({
        投稿: [
          { label: "本日の投稿", status: "ok" },
          { label: "承認待ち3件", status: "blocked" },
        ],
        発送: [{ label: "未発送2件", status: "blocked" }],
        データ: [{ label: "UTM集計", status: "idle" }],
      }),
    ),
  );

  out.push("\n== ume-tamagotchi ==");
  let pet = initPet("うめこ");
  pet = applyPet(pet, { kind: "task.done", project: "投稿" });
  pet = applyPet(pet, { kind: "gate.pending", label: "承認待ち" });
  out.push(`${face(pet)}  mood:${pet.mood} energy:${pet.energy}`);

  out.push("\n== ascii-aquarium (3 frames) ==");
  let tank = initAquarium(30, 3);
  tank = feed(tank, { kind: "task.done", project: "投稿" });
  for (let i = 0; i < 3; i++) {
    out.push(renderTank(tank));
    tank = step(tank);
  }

  out.push("\n== git-replay ==");
  const commits: GitCommit[] = [
    { hash: "a1b2c3d", author: "u", added: 26, removed: 8, coauthoredByClaude: true },
    { hash: "e4f5a6b", author: "u", added: 3, removed: 1, coauthoredByClaude: false },
  ];
  out.push(buildFrames(commits).map(strip).join("\n"));

  out.push("\n== desk-weather ==");
  for (const m of [
    { dirtyFiles: 0, testFailures: 0, staleMemory: 0 },
    { dirtyFiles: 4, testFailures: 0, staleMemory: 1 },
    { dirtyFiles: 10, testFailures: 5, staleMemory: 2 },
  ]) {
    out.push(`${JSON.stringify(m)} -> ${weatherFor(m)}`);
  }

  out.push("\n== routing-slot ==");
  const trials = [
    { taxonomy: "read_only_scan", predictedWorker: "qwen", confidence: 0.85 },
    { taxonomy: "impl_1_3_files", predictedWorker: "codex", confidence: 0.6 },
  ];
  out.push(reel(spin(trials, () => 0)));
  out.push(reel(spin(trials, () => 0.99)));

  out.push("\n== collapse-arcade ==");
  const arcade = spawn([
    { agent: "codex", rate: 0.19 },
    { agent: "cc", rate: 0.02 },
    { agent: "qwen", rate: 0.08 },
  ]);
  out.push(`enemies: ${arcade.enemies.map((e) => `${e.agent}(hp${e.hp})`).join(", ")}`);

  return out.join("\n");
}

describe("showcase", () => {
  it("renders every app (printed for visual review)", () => {
    const s = showcase();
    // eslint-disable-next-line no-console
    console.log(`\n${s}\n`);
    expect(s.length).toBeGreaterThan(0);
  });
});
