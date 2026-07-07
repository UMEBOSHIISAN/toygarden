import type { PlayEvent } from "@umeplay/contracts";

/**
 * ascii-aquarium — ターミナル常駐の ASCII 水槽（secretary-tui スクリーンセーバー枠）。
 * 大小の魚が左右に泳ぎ、泡が絶えず昇り、海藻が揺れ、task.done の餌やりで魚が増える。
 * すべて純関数（seed ベースの決定的乱数）なのでテスト可能。実行は cli.ts。
 */

export type Dir = 1 | -1;
export interface Fish {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  kind: number;
}
export interface Bubble {
  x: number;
  y: number;
}
export interface Aquarium {
  width: number;
  height: number;
  fish: Fish[];
  bubbles: Bubble[];
  tick: number;
  seed: number;
}

// 小→大の魚バリエーション（すべて < > = ° で構成＝表示時にシアン着色される）
const FISH_RIGHT = ["><>", ">°>", "><=>", "><=°>", "><==>", "><===°>"];

/** 決定的乱数（mulberry32 系）。同じ入力なら同じ値 → step が純関数になる。 */
function rand(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const fishLen = (kind: number): number => FISH_RIGHT[kind].length;

export function initAquarium(width = 50, height = 13, count = 7): Aquarium {
  const fish: Fish[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 1 + Math.floor(rand(i * 99 + 1) * (width - 8)),
    y: 2 + Math.floor(rand(i * 7 + 3) * (height - 4)),
    dir: rand(i + 5) > 0.5 ? 1 : -1,
    kind: i % FISH_RIGHT.length,
  }));
  return { width, height, fish, bubbles: [], tick: 0, seed: 1 };
}

/** 1ステップ: 魚が泳ぎ（端で反転）・たまに上下に揺れ、泡が昇り・こまめに湧く。 */
export function step(a: Aquarium): Aquarium {
  const tick = a.tick + 1;
  const fish = a.fish.map((f) => {
    let dir = f.dir;
    let x = f.x + dir;
    const len = fishLen(f.kind);
    if (x < 1) {
      x = 1;
      dir = 1;
    }
    if (x + len > a.width - 1) {
      x = a.width - 1 - len;
      dir = -1;
    }
    let y = f.y;
    const r = rand(a.seed + tick * 31 + f.id * 7);
    if (r < 0.16) y = Math.max(1, y - 1);
    else if (r > 0.84) y = Math.min(a.height - 2, y + 1);
    return { id: f.id, x, y, dir, kind: f.kind };
  });

  // 泡: 上昇して消える。魚の口元と底からこまめに湧く（密度で"生きてる"感）。
  let bubbles = a.bubbles.map((b) => ({ x: b.x, y: b.y - 1 })).filter((b) => b.y >= 1);
  if (rand(a.seed + tick * 17) < 0.7) {
    const bx = 1 + Math.floor(rand(a.seed + tick) * (a.width - 2));
    bubbles = [...bubbles, { x: bx, y: a.height - 2 }];
  }
  for (const f of fish) {
    if (rand(a.seed + tick * 13 + f.id * 5) < 0.12) {
      const mouthX = f.dir === 1 ? f.x + fishLen(f.kind) : f.x - 1;
      if (mouthX > 0 && mouthX < a.width - 1) bubbles = [...bubbles, { x: mouthX, y: f.y }];
    }
  }

  return { ...a, fish, bubbles, tick };
}

/** 餌やり: task.done で新しい魚が左から入ってくる。 */
export function feed(a: Aquarium, e: PlayEvent): Aquarium {
  if (e.kind !== "task.done") return a;
  const id = a.fish.length;
  return {
    ...a,
    fish: [
      ...a.fish,
      { id, x: 1, y: 2 + (id % Math.max(1, a.height - 3)), dir: 1, kind: id % FISH_RIGHT.length },
    ],
  };
}

function glyph(kind: number, dir: Dir): string {
  const r = FISH_RIGHT[kind];
  if (dir === 1) return r;
  return r
    .split("")
    .reverse()
    .map((c) => (c === "<" ? ">" : c === ">" ? "<" : c))
    .join("");
}

/** 水槽をボックス枠付きの複数行文字列に。水面・砂底・揺れる海藻・泡・魚を配置。 */
export function render(a: Aquarium): string {
  const { width: W, height: H } = a;
  const grid: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill(" "));

  for (let x = 0; x < W; x++) {
    grid[0][x] = x % 2 === 0 ? "~" : "-"; // 水面
    grid[H - 1][x] = "."; // 砂底
  }
  // 海藻3株・tick で左右に揺れる
  for (const sx of [3, Math.floor(W / 2), W - 5]) {
    for (let y = H - 2; y > H - 6 && y > 0; y--) {
      grid[y][sx] = (y + a.tick) % 2 === 0 ? ")" : "(";
    }
  }
  for (const b of a.bubbles) {
    if (b.y > 0 && b.y < H - 1 && b.x > 0 && b.x < W) grid[b.y][b.x] = "o";
  }
  for (const f of a.fish) {
    const g = glyph(f.kind, f.dir);
    for (let i = 0; i < g.length; i++) {
      const x = f.x + i;
      if (x > 0 && x < W && f.y > 0 && f.y < H - 1) grid[f.y][x] = g[i];
    }
  }

  const top = `╭${"─".repeat(W)}╮`;
  const bot = `╰${"─".repeat(W)}╯`;
  const body = grid.map((row) => `│${row.join("")}│`).join("\n");
  return `${top}\n${body}\n${bot}`;
}
