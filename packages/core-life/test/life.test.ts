import { describe, expect, it } from "vitest";
import { nextGen, randomGrid, rule1d, type Grid } from "@toygarden/core-life";

function grid(...rows: string[]): Grid {
  return rows.map((row) => [...row].map((cell) => cell === "1"));
}

function row(value: string): boolean[] {
  return [...value].map((cell) => cell === "1");
}

describe("core-life", () => {
  it("oscillates a blinker every two generations", () => {
    const vertical = grid("00000", "00100", "00100", "00100", "00000");
    const horizontal = grid("00000", "00000", "01110", "00000", "00000");

    expect(nextGen(vertical)).toEqual(horizontal);
    expect(nextGen(nextGen(vertical))).toEqual(vertical);
  });

  it("keeps a block still life unchanged", () => {
    const block = grid("0000", "0110", "0110", "0000");

    expect(nextGen(block)).toEqual(block);
  });

  it("moves a glider by one cell in each axis after four generations", () => {
    const initial = grid("01000", "00100", "11100", "00000", "00000");
    const shifted = grid("00000", "00100", "00010", "01110", "00000");
    let generation = initial;

    for (let index = 0; index < 4; index += 1) {
      generation = nextGen(generation);
    }

    expect(generation).toEqual(shifted);
  });

  it("does not mutate the input grid", () => {
    const input = grid("010", "111", "000");
    const snapshot = input.map((cells) => [...cells]);

    nextGen(input);

    expect(input).toEqual(snapshot);
  });

  it("applies rule 30 to a centered live cell", () => {
    const initial = row("0001000");
    const first = rule1d(initial, 30);

    expect(first).toEqual(row("0011100"));
    expect(rule1d(first, 30)).toEqual(row("0110010"));
  });

  it("creates grids with the requested dimensions and extreme densities", () => {
    const dead = randomGrid(() => 0.5, 4, 3, 0);
    const alive = randomGrid(() => 0.5, 4, 3, 1);

    expect(dead).toHaveLength(3);
    expect(dead.every((cells) => cells.length === 4)).toBe(true);
    expect(dead.flat().every((cell) => !cell)).toBe(true);
    expect(alive).toHaveLength(3);
    expect(alive.every((cells) => cells.length === 4)).toBe(true);
    expect(alive.flat().every((cell) => cell)).toBe(true);
  });
});
