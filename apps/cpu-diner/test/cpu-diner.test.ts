import { describe, expect, it } from "vitest";
import { dinerLogic, initDinerState, renderDiner, type CpuDinerState } from "../src/index.js";

function runTicks(state: CpuDinerState, busyness: number, count: number): CpuDinerState {
  let s = state;
  for (let i = 0; i < count; i++) s = dinerLogic(s, busyness);
  return s;
}

describe("dinerLogic", () => {
  it("customers trend upward toward the maximum when busyness stays high", () => {
    const state = runTicks(initDinerState(), 0.9, 30);
    expect(state.customers).toBeGreaterThanOrEqual(15);
  });

  it("staffAwake becomes false when busyness is at or below the sleep threshold (0.2)", () => {
    const state = dinerLogic(initDinerState(), 0.1);
    expect(state.staffAwake).toBe(false);
  });

  it("customers drain to 0 when busyness stays at 0 (nobody comes, everyone leaves)", () => {
    const busy = runTicks(initDinerState(), 0.9, 20); // 先に客を増やしておく
    expect(busy.customers).toBeGreaterThan(0);
    const empty = runTicks(busy, 0.0, 30);
    expect(empty.customers).toBe(0);
  });

  it("is deterministic: same seed + same busyness sequence always produces the same trajectory", () => {
    const sequence = [0.5, 0.7, 0.9, 0.9, 0.3, 0.1, 0.6, 0.8];
    const runOnce = (): CpuDinerState[] => {
      let s = initDinerState(1);
      const trace: CpuDinerState[] = [];
      for (const b of sequence) {
        s = dinerLogic(s, b);
        trace.push(s);
      }
      return trace;
    };
    expect(runOnce()).toEqual(runOnce());
  });
});

describe("renderDiner", () => {
  it("draws a customer glyph ('o') seated at a table when customers > 0", () => {
    const state: CpuDinerState = { customers: 5, staffAwake: true, seed: 1 };
    const lines = renderDiner(state);
    const diningRoom = lines.slice(lines.indexOf("  == dining room ==") + 1, lines.indexOf("  == dining room ==") + 5);
    expect(diningRoom.join("\n")).toContain("o");
  });

  it("draws a sleeping glyph ('zzz') when staffAwake is false", () => {
    const state: CpuDinerState = { customers: 0, staffAwake: false, seed: 1 };
    expect(renderDiner(state).join("\n")).toContain("zzz");
  });

  it("renders a full restaurant scene (kitchen + 4 tables + queue + gauge), not just a status line", () => {
    const state: CpuDinerState = { customers: 5, staffAwake: true, seed: 1 };
    const lines = renderDiner(state);
    expect(lines.length).toBeGreaterThanOrEqual(12);
    expect(lines.length).toBeLessThanOrEqual(18);
    const text = lines.join("\n");
    expect(text).toContain("kitchen");
    expect(text).toContain("dining room");
    expect(text).toContain("table1");
    expect(text).toContain("table4");
    expect(text).toContain("queue outside");
  });

  it("forms a queue once seated tables are full (customers beyond the 16-seat capacity)", () => {
    const full: CpuDinerState = { customers: 16, staffAwake: true, seed: 1 };
    const overflow: CpuDinerState = { customers: 19, staffAwake: true, seed: 1 };
    expect(renderDiner(full).join("\n")).toContain("(nobody waiting)");
    expect(renderDiner(overflow).join("\n")).toContain("waiting for a table");
  });
});
