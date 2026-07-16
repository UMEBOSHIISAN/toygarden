/** mulberry32 — この実装を一字一句使う（決定論の要） */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1..sides の整数（sides < 1 は 1 を返す） */
export function roll(rng: () => number, sides: number): number {
  if (sides < 1) return 1;
  return Math.floor(rng() * sides) + 1;
}

/** Fisher–Yates のコピー版（元配列は不変） */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** 重み付き抽選。重み合計 0 以下なら最初のキーを返す */
export function weighted<T extends string>(rng: () => number, table: Record<T, number>): T {
  const keys = Object.keys(table) as T[];
  const total = keys.reduce((sum, key) => sum + table[key], 0);
  if (total <= 0) return keys[0]!;

  let target = rng() * total;
  for (const key of keys) {
    target -= table[key];
    if (target < 0) return key;
  }
  return keys[keys.length - 1]!;
}
