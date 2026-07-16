import { describe, expect, it } from "vitest";
import { roll, seeded, shuffle, weighted } from "@toygarden/core-dice";

describe("core-dice", () => {
  it("generates the same in-range sequence for the same seed", () => {
    const first = seeded(42);
    const second = seeded(42);
    const firstValues = Array.from({ length: 5 }, () => first());
    const secondValues = Array.from({ length: 5 }, () => second());

    expect(firstValues).toEqual(secondValues);
    for (const value of firstValues) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("generates different first values for different seeds", () => {
    expect(seeded(1)()).not.toBe(seeded(2)());
  });

  it("rolls integers within the die range", () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i += 1) {
      const value = roll(rng, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it("shuffles a copy deterministically while preserving all elements", () => {
    const input = [1, 2, 2, 3];
    const original = [...input];
    const first = shuffle(seeded(11), input);
    const second = shuffle(seeded(11), input);

    expect(first).toHaveLength(input.length);
    expect([...first].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b));
    expect(input).toEqual(original);
    expect(first).toEqual(second);
  });

  it("selects by weight deterministically", () => {
    const fixed = seeded(13);
    for (let i = 0; i < 100; i += 1) {
      expect(weighted(fixed, { a: 1, b: 0 })).toBe("a");
    }

    const first = seeded(17);
    const second = seeded(17);
    const firstResults = Array.from({ length: 20 }, () => weighted(first, { a: 1, b: 1 }));
    const secondResults = Array.from({ length: 20 }, () => weighted(second, { a: 1, b: 1 }));
    expect(firstResults).toEqual(secondResults);
  });
});
