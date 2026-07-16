import { describe, expect, it } from "vitest";
import { expand, PRESETS, turtle } from "@toygarden/core-lsystem";

describe("core-lsystem", () => {
  it("produces Fibonacci lengths for the algae system", () => {
    const rules = { A: "AB", B: "A" };
    const lengths = Array.from({ length: 5 }, (_, n) => expand("A", rules, n).length);

    expect(lengths).toEqual([1, 2, 3, 5, 8]);
  });

  it("multiplies the number of Koch forward commands by five", () => {
    const rules = { F: "F+F-F-F+F" };

    expect([...expand("F", rules, 1)].filter((symbol) => symbol === "F")).toHaveLength(5);
    expect([...expand("F", rules, 2)].filter((symbol) => symbol === "F")).toHaveLength(25);
  });

  it("preserves symbols without rewriting rules", () => {
    expect(expand("G+G", {}, 3)).toBe("G+G");
  });

  it("starts at the origin facing upward", () => {
    expect(turtle("F")).toEqual([
      { x0: 0, y0: 0, x1: 0, y1: 1, depth: 0 },
    ]);
  });

  it("restores position and heading after a branch", () => {
    const segments = turtle("F[+F]F");

    expect(segments).toHaveLength(3);
    expect(segments[1].depth).toBe(1);
    expect(segments[2].x0).toBe(segments[0].x1);
    expect(segments[2].y0).toBe(segments[0].y1);
    expect(segments[2].x1).toBe(segments[2].x0);
    expect(segments[2].y1).toBeGreaterThan(segments[2].y0);
  });

  it("turns the second segment horizontal at 90 degrees", () => {
    const segments = turtle("F+F", { angleDeg: 90 });

    expect(segments[1].y1 - segments[1].y0).toBeCloseTo(0);
  });

  it("provides expandable presets containing forward commands", () => {
    for (const preset of Object.values(PRESETS)) {
      const result = expand(preset.axiom, preset.rules, 2);

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("F");
    }
  });
});
