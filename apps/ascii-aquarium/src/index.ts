import type { PlayEvent } from "@umeplay/contracts";

/**
 * ascii-aquarium — ターミナル常駐の ASCII 水槽（secretary-tui スクリーンセーバー枠）。
 * 大小の魚が泳ぎ、泡が昇り、海藻が揺れ、餌やりで魚が増える。
 * たまに鯨が潜り、魚がきらめき(光る)、カニが底を横歩きし、ときどき夜になる。
 * すべて純関数（seed ベースの決定的乱数）でテスト可能。実行は cli.ts。
 */

export type Dir = 1 | -1;
export interface Fish {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  kind: number;
}
export interface Cell {
  x: number;
  y: number;
}
export interface Whale {
  x: number;
  y: number;
  dir: Dir;
}
export interface Crab {
  x: number;
  dir: Dir;
}
export interface Aquarium {
  width: number;
  height: number;
  fish: Fish[];
  bubbles: Cell[];
  sparkles: Cell[];
  whale: Whale | null;
  crab: Crab;
  night: boolean;
  tick: number;
  seed: number;
}

// 小→大の魚バリエーション（すべて < > = ° で構成＝表示時にシアン着色される）
const FISH_RIGHT = ["><>", ">°>", "><=>", "><=°>", "><==>", "><===°>"];
// 鯨（胴の ≡ はマゼンタ着色して目立たせる）
const WHALE_RIGHT = "<°≡≡≡≡≡≡≡≡≡≡>";
const WHALE_SPEED = 1;
const CRAB = "V@V"; // @ = 甲羅(赤), V = 脚

/** 決定的乱数（mulberry32 系）。同じ入力なら同じ値 → step が純関数になる。 */
function rand(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const fishLen = (kind: number): number => FISH_RIGHT[kind].length;

function flip(glyph: string): string {
  return glyph
    .split("")
    .reverse()
    .map((c) => (c === "<" ? ">" : c === ">" ? "<" : c))
    .join("");
}

export function initAquarium(width = 50, height = 13, count = 7): Aquarium {
  const fish: Fish[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 1 + Math.floor(rand(i * 99 + 1) * (width - 8)),
    y: 2 + Math.floor(rand(i * 7 + 3) * (height - 4)),
    dir: rand(i + 5) > 0.5 ? 1 : -1,
    kind: i % FISH_RIGHT.length,
  }));
  return {
    width,
    height,
    fish,
    bubbles: [],
    sparkles: [],
    whale: null,
    crab: { x: Math.floor(width / 2), dir: 1 },
    night: false,
    tick: 0,
    seed: 1,
  };
}

/** 1ステップ: 魚・泡・海藻・鯨・きらめき・カニ・昼夜を進める。 */
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

  // 泡: 上昇して消える。底＋魚の口元からこまめに湧く。
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

  // きらめき: たまに1匹の魚の周りが光る（1tickで消えて再生＝twinkle）
  let sparkles: Cell[] = [];
  if (fish.length && rand(a.seed + tick * 53) < 0.5) {
    const f = fish[Math.floor(rand(a.seed + tick * 59) * fish.length)];
    sparkles = [
      { x: f.x - 1, y: f.y },
      { x: f.x + fishLen(f.kind), y: f.y - 1 },
    ].filter((s) => s.x > 0 && s.x < a.width - 1 && s.y > 0 && s.y < a.height - 1);
  }

  // 鯨: いなければ低確率で水面に出現、いれば潜りながら横切り、画面外で消える。
  const wLen = WHALE_RIGHT.length;
  const diveFloor = a.height - 3;
  let whale = a.whale;
  if (whale) {
    const wx = whale.x + whale.dir * WHALE_SPEED;
    const off = whale.dir === 1 ? wx > a.width : wx + wLen < 0;
    const wy = tick % 3 === 0 ? Math.min(diveFloor, whale.y + 1) : whale.y;
    whale = off ? null : { x: wx, y: wy, dir: whale.dir };
  } else if (rand(a.seed + tick * 41) < 0.08) {
    const dir: Dir = rand(a.seed + tick * 43) > 0.5 ? 1 : -1;
    const wx = dir === 1 ? 1 - wLen : a.width - 1;
    whale = { x: wx, y: 1, dir };
  }

  // カニ: 底を左右に横歩き（端で反転）
  let cx = a.crab.x + a.crab.dir;
  let cdir = a.crab.dir;
  if (cx < 1) {
    cx = 1;
    cdir = 1;
  }
  if (cx > a.width - CRAB.length - 1) {
    cx = a.width - CRAB.length - 1;
    cdir = -1;
  }
  const crab: Crab = { x: cx, dir: cdir };

  // 昼夜: 120tick周期で ~25tick 夜になる（約14秒周期）
  const night = tick % 120 >= 95;

  return { ...a, fish, bubbles, sparkles, whale, crab, night, tick };
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
  return dir === 1 ? r : flip(r);
}

/** 水槽をボックス枠付きの複数行文字列に。 */
export function render(a: Aquarium): string {
  const { width: W, height: H } = a;
  const grid: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill(" "));

  for (let x = 0; x < W; x++) {
    grid[0][x] = x % 2 === 0 ? "~" : "-"; // 水面
    grid[H - 1][x] = "."; // 砂底
  }
  // 夜: 月(O)と星(*)を散らす
  if (a.night) {
    const moonX = W - 5;
    if (grid[1][moonX] === " ") grid[1][moonX] = "O"; // 月
    const stars: [number, number][] = [
      [5, 1],
      [11, 2],
      [Math.floor(W * 0.3), 1],
      [Math.floor(W * 0.44), 2],
      [Math.floor(W * 0.58), 1],
      [Math.floor(W * 0.66), 3],
    ];
    for (const [sx, sy] of stars) {
      if (sy > 0 && sy < H - 1 && grid[sy][sx] === " ") grid[sy][sx] = "*";
    }
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
  // 鯨（最前面・潜り始めは潮吹き）
  if (a.whale) {
    const wg = a.whale.dir === 1 ? WHALE_RIGHT : flip(WHALE_RIGHT);
    const headX = a.whale.x + Math.floor(wg.length / 2);
    if (a.whale.y <= 2 && a.whale.y - 1 > 0 && headX > 0 && headX < W) grid[a.whale.y - 1][headX] = "o";
    for (let i = 0; i < wg.length; i++) {
      const x = a.whale.x + i;
      if (x > 0 && x < W && a.whale.y > 0 && a.whale.y < H - 1) grid[a.whale.y][x] = wg[i];
    }
  }
  // きらめき
  for (const s of a.sparkles) {
    if (s.y > 0 && s.y < H - 1 && s.x > 0 && s.x < W) grid[s.y][s.x] = "*";
  }
  // カニ（砂のすぐ上を横歩き・最前面）
  const crabRow = H - 2;
  for (let i = 0; i < CRAB.length; i++) {
    const x = a.crab.x + i;
    if (x > 0 && x < W && crabRow > 0 && crabRow < H - 1) grid[crabRow][x] = CRAB[i];
  }

  const top = `╭${"─".repeat(W)}╮`;
  const bot = `╰${"─".repeat(W)}╯`;
  const body = grid.map((row) => `│${row.join("")}│`).join("\n");
  return `${top}\n${body}\n${bot}`;
}
