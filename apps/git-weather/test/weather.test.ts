import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import type { GitCommit } from "@toygarden/core-git-observe";
import { repoWeather, draw } from "../src/index.js";

const commit = (added: number, removed: number): GitCommit => ({
  hash: "abc123",
  author: "human",
  added,
  removed,
  coauthoredByClaude: false,
});

describe("git-weather", () => {
  it("no churn = sunny, heavy churn = storm", () => {
    expect(repoWeather([])).toBe("sunny");
    expect(repoWeather([commit(200, 200)])).toBe("storm");
  });

  it("device draw obeys HAL contract (clear→…→flush, ASCII-only text, ≤30 commands)", () => {
    const dev = new MockDevice();
    draw(dev, [commit(150, 120), commit(30, 10)]);
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.flushes.length).toBe(1);
    expect(dev.flushes[0]).toEqual(dev.drawn);
    expect(dev.drawn.length).toBeLessThanOrEqual(30);
    for (const cmd of dev.drawn) {
      if (cmd.op === "text") expect(/^[\x20-\x7e]*$/.test(cmd.text)).toBe(true);
    }
  });
});
