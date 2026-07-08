import { describe, it, expect } from "vitest";
import { spin, reel } from "../src/index.js";
import type { RoutingTrial } from "@toygarden/core-worker-data";

const trials: RoutingTrial[] = [
  { taxonomy: "read_only_scan", predictedWorker: "qwen", confidence: 0.85 },
  { taxonomy: "impl_1_3_files", predictedWorker: "codex", confidence: 0.6 },
];

describe("routing-slot", () => {
  it("spins deterministically with injected rng", () => {
    const r = spin(trials, () => 0); // first entry
    expect(r.worker).toBe("qwen");
    expect(r.jackpot).toBe(true); // 0.85 >= 0.8
  });

  it("non-jackpot below 0.8", () => {
    const r = spin(trials, () => 0.99); // last entry
    expect(r.worker).toBe("codex");
    expect(r.jackpot).toBe(false);
  });

  it("reel renders taxonomy/worker/percent", () => {
    const s = reel(spin(trials, () => 0));
    expect(s).toContain("read_only_scan");
    expect(s).toContain("qwen");
    expect(s).toContain("85%");
    expect(s).toContain("JACKPOT");
  });

  it("throws when there is nothing to spin", () => {
    expect(() => spin([])).toThrow(/no trials/);
  });
});
