import { describe, it, expect } from "vitest";
import { initAquarium, step, feed, render } from "../src/index.js";

describe("ascii-aquarium", () => {
  it("starts with the requested number of fish inside bounds", () => {
    const a = initAquarium(44, 11, 4);
    expect(a.fish).toHaveLength(4);
    for (const f of a.fish) {
      expect(f.x).toBeGreaterThanOrEqual(1);
      expect(f.y).toBeGreaterThanOrEqual(1);
      expect(f.y).toBeLessThan(a.height - 1);
    }
  });

  it("step advances the tick and is deterministic (pure)", () => {
    const a = initAquarium();
    const once = step(a);
    const twice = step(a);
    expect(once.tick).toBe(1);
    expect(once).toEqual(twice); // 同じ入力 → 同じ出力
  });

  it("fish swim and flip direction at the walls", () => {
    let a = initAquarium(12, 8, 1);
    a = { ...a, fish: [{ id: 0, x: 8, y: 3, dir: 1, kind: 0 }] }; // 右端付近・右向き
    a = step(a);
    expect(a.fish[0].dir).toBe(-1); // 壁で反転
  });

  it("feeding (task.done) adds a fish, other events do not", () => {
    const base = initAquarium(44, 11, 2);
    expect(feed(base, { kind: "task.done", project: "投稿" }).fish).toHaveLength(3);
    expect(feed(base, { kind: "deploy.success" }).fish).toHaveLength(2);
  });

  it("render draws a bordered tank of the right shape", () => {
    const out = render(initAquarium(44, 11, 3));
    const lines = out.split("\n");
    expect(lines).toHaveLength(13); // height 11 + 上下の枠
    expect(lines[0].startsWith("╭")).toBe(true);
    expect(lines.at(-1)?.startsWith("╰")).toBe(true);
    expect(lines[1].startsWith("│")).toBe(true);
    expect(lines[1].endsWith("│")).toBe(true);
  });
});
