import type { PlayEvent } from "@umeplay/contracts";

/**
 * ascii-aquarium — ターミナル常駐の ASCII 水槽。
 * 魚・泡・海藻に加え、鯨🐋・カニ🦀・きらめき✨・夜🌙・ウミガメ🐢・水流🌊・ふぐ🐡。
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
export interface Mover {
  x: number;
  y: number;
  dir: Dir;
}
export interface Crab {
  x: number;
  dir: Dir;
}
export interface Puffer {
  x: number;
  y: number;
  dir: Dir;
  inflated: boolean;
}
export interface Aquarium {
  width: number;
  height: number;
  fish: Fish[];
  bubbles: Cell[];
  sparkles: Cell[];
  whale: Mover | null;
  turtle: Mover | null;
  crab: Crab;
  puffer: Puffer;
  current: number; // -1=左流れ / 0=無 / 1=右流れ
  night: boolean;
  tick: number;
  seed: number;
}

const FISH_RIGHT = ["><>", ">°>", "><=>", "><=°>", "><==>", "><===°>"];
const WHALE_RIGHT = "<°≡≡≡≡≡≡≡≡≡≡>"; // ≡ = マゼンタ胴
const TURTLE_RIGHT = "°(###)>"; // # = 緑の甲羅
const CRAB = "V@V"; // @ = 甲羅(赤), V = 脚
const WHALE_SPEED = 1;

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

function pufferGlyph(inflated: boolean): string {
  return inflated ? "*<°°°>*" : "<°>";
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
    turtle: null,
    crab: { x: Math.floor(width / 2), dir: 1 },
    puffer: { x: Math.floor(width * 0.3), y: Math.floor(height / 2), dir: 1, inflated: false },
    current: 0,
    night: false,
    tick: 0,
    seed: 1,
  };
}

/** 1ステップ: 全生態を進める。 */
export function step(a: Aquarium): Aquarium {
  const tick = a.tick + 1;

  // 水流: 170tick周期の最初の20tickだけ発生（左右交互）
  const current = tick % 170 < 20 ? (Math.floor(tick / 170) % 2 === 0 ? 1 : -1) : 0;

  const fish = a.fish.map((f) => {
    let dir = f.dir;
    let x = f.x + dir + current; // 水流ぶん流される
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

  // 泡
  let bubbles = a.bubbles.map((b) => ({ x: b.x, y: b.y - 1 })).filter((b) => b.y >= 1);
  if (rand(a.seed + tick * 17) < 0.7) {
    bubbles = [...bubbles, { x: 1 + Math.floor(rand(a.seed + tick) * (a.width - 2)), y: a.height - 2 }];
  }
  for (const f of fish) {
    if (rand(a.seed + tick * 13 + f.id * 5) < 0.12) {
      const mouthX = f.dir === 1 ? f.x + fishLen(f.kind) : f.x - 1;
      if (mouthX > 0 && mouthX < a.width - 1) bubbles = [...bubbles, { x: mouthX, y: f.y }];
    }
  }

  // きらめき
  let sparkles: Cell[] = [];
  if (fish.length && rand(a.seed + tick * 53) < 0.5) {
    const f = fish[Math.floor(rand(a.seed + tick * 59) * fish.length)];
    sparkles = [
      { x: f.x - 1, y: f.y },
      { x: f.x + fishLen(f.kind), y: f.y - 1 },
    ].filter((s) => s.x > 0 && s.x < a.width - 1 && s.y > 0 && s.y < a.height - 1);
  }

  // 鯨（水面から潜って横切る）
  const wLen = WHALE_RIGHT.length;
  let whale = a.whale;
  if (whale) {
    const wx = whale.x + whale.dir * WHALE_SPEED;
    const off = whale.dir === 1 ? wx > a.width : wx + wLen < 0;
    const wy = tick % 3 === 0 ? Math.min(a.height - 3, whale.y + 1) : whale.y;
    whale = off ? null : { x: wx, y: wy, dir: whale.dir };
  } else if (rand(a.seed + tick * 41) < 0.08) {
    const dir: Dir = rand(a.seed + tick * 43) > 0.5 ? 1 : -1;
    whale = { x: dir === 1 ? 1 - wLen : a.width - 1, y: 1, dir };
  }

  // ウミガメ（ゆっくり2tickに1歩・中〜下層を横切る）
  const tLen = TURTLE_RIGHT.length;
  let turtle = a.turtle;
  if (turtle) {
    const move = tick % 2 === 0 ? turtle.dir : 0;
    const tx = turtle.x + move;
    const off = turtle.dir === 1 ? tx > a.width : tx + tLen < 0;
    turtle = off ? null : { x: tx, y: turtle.y, dir: turtle.dir };
  } else if (rand(a.seed + tick * 61) < 0.04) {
    const dir: Dir = rand(a.seed + tick * 67) > 0.5 ? 1 : -1;
    const ty = Math.floor(a.height / 2) + Math.floor(rand(a.seed + tick * 71) * 3);
    turtle = { x: dir === 1 ? 1 - tLen : a.width - 1, y: ty, dir };
  }

  // カニ（底を横歩き）
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

  // ふぐ（70tick周期で20tick膨らむ・膨張時は幅が広がる）
  const pInflated = tick % 70 >= 50;
  const pLen = pInflated ? 7 : 3;
  let pdir = a.puffer.dir;
  let px = a.puffer.x + pdir + current;
  if (px < 1) {
    px = 1;
    pdir = 1;
  }
  if (px + pLen > a.width - 1) {
    px = a.width - 1 - pLen;
    pdir = -1;
  }
  const puffer: Puffer = { x: px, y: a.puffer.y, dir: pdir, inflated: pInflated };

  const night = tick % 120 >= 95;

  return { ...a, fish, bubbles, sparkles, whale, turtle, crab, puffer, current, night, tick };
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

function draw(grid: string[][], x: number, y: number, s: string, W: number, H: number): void {
  for (let i = 0; i < s.length; i++) {
    const px = x + i;
    if (px > 0 && px < W && y > 0 && y < H - 1) grid[y][px] = s[i];
  }
}

/** 水槽をボックス枠付きの複数行文字列に。 */
export function render(a: Aquarium): string {
  const { width: W, height: H } = a;
  const grid: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill(" "));

  for (let x = 0; x < W; x++) {
    grid[0][x] = x % 2 === 0 ? "~" : "-";
    grid[H - 1][x] = ".";
  }
  // 夜: 月と星
  if (a.night) {
    if (grid[1][W - 5] === " ") grid[1][W - 5] = "O";
    const stars: [number, number][] = [
      [5, 1],
      [11, 2],
      [Math.floor(W * 0.3), 1],
      [Math.floor(W * 0.44), 2],
      [Math.floor(W * 0.58), 1],
      [Math.floor(W * 0.66), 3],
    ];
    for (const [sx, sy] of stars) if (sy > 0 && sy < H - 1 && grid[sy][sx] === " ") grid[sy][sx] = "*";
  }
  // 水流の流れマーク
  if (a.current !== 0) {
    const arrow = a.current === 1 ? "»" : "«";
    for (const fy of [2, Math.floor(H / 2), H - 4]) {
      for (let fx = 2; fx < W - 2; fx += 6) {
        if (fy > 0 && fy < H - 1 && grid[fy][fx] === " ") grid[fy][fx] = arrow;
      }
    }
  }
  // 海藻3株・揺れる
  for (const sx of [3, Math.floor(W / 2), W - 5]) {
    for (let y = H - 2; y > H - 6 && y > 0; y--) grid[y][sx] = (y + a.tick) % 2 === 0 ? ")" : "(";
  }
  for (const b of a.bubbles) if (b.y > 0 && b.y < H - 1 && b.x > 0 && b.x < W) grid[b.y][b.x] = "o";
  for (const f of a.fish) draw(grid, f.x, f.y, glyph(f.kind, f.dir), W, H);
  // ふぐ
  draw(grid, a.puffer.x, a.puffer.y, pufferGlyph(a.puffer.inflated), W, H);
  // ウミガメ
  if (a.turtle) draw(grid, a.turtle.x, a.turtle.y, a.turtle.dir === 1 ? TURTLE_RIGHT : flip(TURTLE_RIGHT), W, H);
  // 鯨（潮吹き）
  if (a.whale) {
    const wg = a.whale.dir === 1 ? WHALE_RIGHT : flip(WHALE_RIGHT);
    const headX = a.whale.x + Math.floor(wg.length / 2);
    if (a.whale.y <= 2 && a.whale.y - 1 > 0 && headX > 0 && headX < W) grid[a.whale.y - 1][headX] = "o";
    draw(grid, a.whale.x, a.whale.y, wg, W, H);
  }
  // きらめき
  for (const s of a.sparkles) if (s.y > 0 && s.y < H - 1 && s.x > 0 && s.x < W) grid[s.y][s.x] = "*";
  // カニ（最前面・底のすぐ上）
  draw(grid, a.crab.x, H - 2, CRAB, W, H);

  const top = `╭${"─".repeat(W)}╮`;
  const bot = `╰${"─".repeat(W)}╯`;
  const body = grid.map((row) => `│${row.join("")}│`).join("\n");
  return `${top}\n${body}\n${bot}`;
}
