export type Grid = boolean[][];

/** Conway B3/S23. Cells outside the grid are dead. */
export function nextGen(grid: Grid): Grid {
  return grid.map((row, y) =>
    row.map((_, x) => {
      let neighbors = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if ((dx !== 0 || dy !== 0) && grid[y + dy]?.[x + dx]) {
            neighbors += 1;
          }
        }
      }

      return neighbors === 3 || (grid[y][x] && neighbors === 2);
    }),
  );
}

/** Apply an elementary cellular automaton rule with dead cells beyond each edge. */
export function rule1d(row: boolean[], rule: number): boolean[] {
  return row.map((_, index) => {
    const left = row[index - 1] ? 1 : 0;
    const center = row[index] ? 1 : 0;
    const right = row[index + 1] ? 1 : 0;
    const neighborhood = (left << 2) | (center << 1) | right;

    return ((rule >> neighborhood) & 1) === 1;
  });
}

/** Build a w-by-h grid whose cells live when rng() is below density. */
export function randomGrid(
  rng: () => number,
  w: number,
  h: number,
  density: number,
): Grid {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => rng() < density),
  );
}
