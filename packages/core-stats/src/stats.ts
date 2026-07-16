/** 時刻つきローリング窓。values(at) は (at - ms, at] 内の値を push 順で返す */
export function createWindow(ms: number): {
  push(v: number, at: number): void;
  values(at: number): number[];
} {
  const entries: Array<{ value: number; at: number }> = [];

  return {
    push(value, at) {
      entries.push({ value, at });
    },
    values(at) {
      return entries
        .filter((entry) => entry.at > at - ms && entry.at <= at)
        .map((entry) => entry.value);
    },
  };
}

/** 指数移動平均。初回 push は value をその値に設定。push は更新後の値を返す */
export function createEma(alpha: number): {
  push(v: number): number;
  value(): number;
} {
  let current = Number.NaN;
  let initialized = false;

  return {
    push(value) {
      current = initialized ? alpha * value + (1 - alpha) * current : value;
      initialized = true;
      return current;
    },
    value() {
      return current;
    },
  };
}

/**
 * ヒストグラム。min/max 省略時は values の min/max。
 * bin 幅 = (max - min) / bins。v === max は最後の bin に入れる。
 * values が空なら全 bin 0。min === max なら全値を最後の bin に入れる。
 */
export function histogram(
  values: readonly number[],
  bins: number,
  min?: number,
  max?: number,
): number[] {
  const counts = new Array<number>(bins).fill(0);
  if (values.length === 0) return counts;

  const lower = min ?? Math.min(...values);
  const upper = max ?? Math.max(...values);
  if (lower === upper) {
    counts[bins - 1] = values.length;
    return counts;
  }

  const width = (upper - lower) / bins;
  for (const value of values) {
    const index = value === upper ? bins - 1 : Math.floor((value - lower) / width);
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}

/** keyFn の値ごとの件数 */
export function tally<T>(items: readonly T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
