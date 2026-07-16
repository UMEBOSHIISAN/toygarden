import { describe, expect, it } from "vitest";
import { seeded } from "@toygarden/core-dice";
import { fbm1, fbm2, noise1, noise2 } from "@toygarden/core-noise";

function hash(seed: number, x: number, y = 0): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

describe("core-noise", () => {
  it("is deterministic for the same seeds and coordinates", () => {
    expect(noise1(42)(1.25)).toBe(noise1(42)(1.25));
    expect(noise2(42)(1.25, -3.5)).toBe(noise2(42)(1.25, -3.5));
    expect(fbm1(42, 4)(1.25)).toBe(fbm1(42, 4)(1.25));
    expect(fbm2(42, 4)(1.25, -3.5)).toBe(fbm2(42, 4)(1.25, -3.5));
  });

  it("keeps sampled values in range", () => {
    const rng = seeded(23);
    const one = noise1(9);
    const two = noise2(9);
    const fractalOne = fbm1(9, 5);
    const fractalTwo = fbm2(9, 5);

    for (let i = 0; i < 100; i += 1) {
      const x = rng() * 20 - 10;
      const y = rng() * 20 - 10;
      for (const value of [one(x), two(x, y), fractalOne(x), fractalTwo(x, y)]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("equals the lattice hash at integer coordinates", () => {
    expect(noise1(7)(3)).toBe(hash(7, 3));
  });

  it("is continuous between nearby coordinates", () => {
    const noise = noise1(7);
    for (let x = 0; x <= 2; x += 0.5) {
      expect(Math.abs(noise(x + 0.01) - noise(x))).toBeLessThan(0.15);
    }
  });

  it("depends on the seed", () => {
    expect(noise1(1)(0.5)).not.toBe(noise1(2)(0.5));
  });
});
