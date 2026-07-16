import { describe, expect, it } from "vitest";
import { createEma, createWindow, histogram, tally } from "../src/index.js";

describe("core-stats", () => {
  it("returns values inside the rolling window in push order", () => {
    const window = createWindow(100);
    window.push(1, 0);
    window.push(2, 50);

    expect(window.values(50)).toEqual([1, 2]);

    window.push(3, 120);
    expect(window.values(120)).toEqual([2, 3]);
  });

  it("calculates an exponential moving average", () => {
    const ema = createEma(0.5);

    expect(ema.value()).toBeNaN();
    expect(ema.push(1)).toBe(1);
    expect(ema.push(2)).toBe(1.5);
    expect(ema.push(2)).toBe(1.75);
  });

  it("puts boundary and maximum values in the later bin", () => {
    expect(histogram([0, 0.5, 1], 2)).toEqual([1, 2]);
  });

  it("returns empty bins for an empty input", () => {
    expect(histogram([], 3)).toEqual([0, 0, 0]);
  });

  it("tallies items by key", () => {
    expect(tally(["a", "b", "a"], (value) => value)).toEqual({ a: 2, b: 1 });
  });
});
