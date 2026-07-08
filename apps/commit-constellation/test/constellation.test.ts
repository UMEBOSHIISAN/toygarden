import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import type { GitCommit } from "@toygarden/core-git-observe";
import { authorStars, draw } from "../src/index.js";

const commits: GitCommit[] = [
  { hash: "a1", author: "human", added: 20, removed: 4, coauthoredByClaude: false },
  { hash: "a2", author: "codex", added: 60, removed: 10, coauthoredByClaude: true },
  { hash: "a3", author: "human", added: 8, removed: 2, coauthoredByClaude: false },
  { hash: "a4", author: "cc", added: 30, removed: 5, coauthoredByClaude: true },
];

describe("commit-constellation", () => {
  it("weights authors by total churn, sorted descending", () => {
    const stars = authorStars(commits);
    expect(stars[0]).toEqual({ author: "codex", weight: 70 });
    expect(stars.find((s) => s.author === "human")?.weight).toBe(34);
  });

  it("device draw obeys HAL contract (clear→…→flush, ASCII-only text, ≤30 commands)", () => {
    const dev = new MockDevice();
    draw(dev, commits);
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.flushes.length).toBe(1);
    expect(dev.flushes[0]).toEqual(dev.drawn);
    expect(dev.drawn.length).toBeLessThanOrEqual(30);
    for (const cmd of dev.drawn) {
      if (cmd.op === "text") expect(/^[\x20-\x7e]*$/.test(cmd.text)).toBe(true);
    }
  });
});
