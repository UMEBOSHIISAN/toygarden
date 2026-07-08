import { describe, it, expect } from "vitest";
import { spawn, shoot, cleared } from "../src/index.js";
import type { CollapseStat } from "@toygarden/core-worker-data";

const stats: CollapseStat[] = [
  { agent: "codex", rate: 0.19 }, // 敵
  { agent: "cc", rate: 0.02 }, // 閾値以下 → 敵にならない
];

describe("collapse-arcade", () => {
  it("spawns enemies only above the threshold", () => {
    const s = spawn(stats);
    expect(s.enemies).toHaveLength(1);
    expect(s.enemies[0].agent).toBe("codex");
    expect(s.enemies[0].hp).toBe(19);
  });

  it("shooting reduces hp and scores on kill", () => {
    let s = spawn([{ agent: "codex", rate: 0.1 }]); // hp 10
    s = shoot(s, "codex"); // -10 → dead
    expect(s.score).toBe(100);
    expect(cleared(s)).toBe(true);
  });

  it("partial damage does not kill", () => {
    let s = spawn([{ agent: "codex", rate: 0.5 }]); // hp 50
    s = shoot(s, "codex");
    expect(s.enemies[0].hp).toBe(40);
    expect(s.score).toBe(0);
  });
});
