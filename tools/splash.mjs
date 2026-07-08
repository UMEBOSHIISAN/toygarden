/**
 * splash.mjs — `npx toygarden` の目玉になる、映画的な起動スプラッシュ（3.5秒/20fps）。
 * GLM-5.2 の絵コンテ（Beat1〜Beat8）に忠実な実装。技術都合で細部は調整しているが、
 * 各ビートの演出意図（星の湧き→ロゴの色収差収束→スライド→グリッド床→魚群→会話ボックス
 * →ハート鼓動→ノイズ暗転からのシームレスな着地）は崩していない。
 *
 *   node tools/splash.mjs        # 単体実行（そのまま3.5秒のスプラッシュだけ流す）
 *
 * playSplash() は Promise を返す。任意のキー入力で即座に resolve（スキップ）する。
 * 非TTY・TOYGARDEN_NO_SPLASH=1・80x24未満の端末では、それぞれ「出さない」「出さない」
 * 「簡易版に degrade」という3つの縮退経路を持つ（80x24未満でも完全な no-op にはしない。
 * ロゴ+ボックスだけの簡易版で "起動した感" は残す）。
 *
 * 外部依存なし・音なし。グリフはフォント制約のある core-termgif を使わず、この場限りの
 * 手組みブロック文字（█）で足りる分だけ用意している（端末表示は自由な文字が使えるため）。
 */
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const COLS = 80;
const ROWS = 24;
const FPS = 20;
const FRAME_MS = 1000 / FPS;
const TOTAL_MS = 3500;

// --- ANSI（既存の hello.mjs / tour.mjs と揃えた基本パレット） ---------------
const RESET = "\x1b[0m";
const WHITE = "\x1b[97m";
const DIM = "\x1b[2m";
const MAGENTA = "\x1b[35m";
const MAGENTA_BOLD = "\x1b[1;35m";
const MAGENTA_DIM = "\x1b[2;35m";
const CYAN = "\x1b[36m";
const CYAN_DIM = "\x1b[2;36m";
const YELLOW = "\x1b[33m";

// --- ビートのタイムテーブル（絵コンテそのまま・単位ms） --------------------
const BEATS = {
  stars: [0, 400],
  logo: [400, 900],
  slide: [900, 1300],
  grid: [1300, 1700],
  fish: [1700, 2100],
  box: [2100, 2600],
  heart: [2600, 2900],
  climax: [2900, 3500],
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- 手組みの5行ブロックロゴ（"toygarden"。フォント制約なしの自由描画） -------
const GLYPHS = {
  u: ["█ █", "█ █", "█ █", "█ █", " █ "],
  m: ["█   █", "██ ██", "█ █ █", "█   █", "█   █"],
  e: ["███", "█  ", "██ ", "█  ", "███"],
  p: ["██ ", "█ █", "██ ", "█  ", "█  "],
  l: ["█  ", "█  ", "█  ", "█  ", "███"],
  a: [" █ ", "█ █", "███", "█ █", "█ █"],
  y: ["█ █", "█ █", " █ ", " █ ", " █ "],
  t: [" █ ", "███", " █ ", " █ ", " ██"],
  o: ["███", "█ █", "█ █", "█ █", "███"],
  g: ["███", "█  ", "█ ██", "█  █", " ███"],
  r: ["██ ", "█ █", "██ ", "█ █", "█ █"],
  d: ["  █", "  █", "███", "█ █", "███"],
  n: ["██ ", "█ █", "█ █", "█ █", "█ █"],
};
const LOGO_WORD = "toygarden";
const LOGO_ROWS = 5;
const LOGO_GAP = 1;
function logoWidth() {
  let w = 0;
  for (const ch of LOGO_WORD) w += GLYPHS[ch][0].length + LOGO_GAP;
  return w - LOGO_GAP;
}
const LOGO_START_X = Math.floor((COLS - logoWidth()) / 2);
const LOGO_Y_LOW = 12; // Beat1-2: 画面中ほど
const LOGO_Y_HIGH = 1; // Beat3以降: 上に固定し、下に空間を作る

// --- 会話ボックスの位置（Beat6のボックスと Beat8 のボックスは同じ座標を使う） --
const BOX_W = 42;
const BOX_FULL_H = 7;
const BOX_X = Math.floor((COLS - BOX_W) / 2);
const BOX_CENTER_Y = 17;
const BOX_TEXT_1 = "* Loading the arcade...";
const BOX_TEXT_2 = "* Hello, Player.";

// --- グリッド床 --------------------------------------------------------
const FLOOR_TOP = 13;
const FLOOR_BOTTOM = 21;
const FLOOR_H_LINES = 4;
const FLOOR_V_LINES = 7;

// --- 文字グリッド（80x24固定・毎フレーム全セル明示描画で差分クリア不要） -----
function makeGrid() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
}
function clearGrid(grid) {
  for (let y = 0; y < ROWS; y++) grid[y].fill(null);
}
function setCell(grid, x, y, ch, color) {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
  grid[y][x] = { ch, color };
}
function setText(grid, x, y, text, color) {
  for (let i = 0; i < text.length; i++) setCell(grid, x + i, y, text[i], color);
}
function renderGrid(grid) {
  const lines = [];
  for (let y = 0; y < ROWS; y++) {
    let line = "";
    let current = undefined;
    for (let x = 0; x < COLS; x++) {
      const cell = grid[y][x];
      const ch = cell ? cell.ch : " ";
      const color = cell ? cell.color : null;
      if (color !== current) {
        line += color ?? RESET;
        current = color;
      }
      line += ch;
    }
    line += RESET;
    lines.push(line);
  }
  return lines.join("\n");
}
function paint(grid) {
  process.stdout.write("\x1b[H" + renderGrid(grid));
}
function hideCursor() {
  process.stdout.write("\x1b[?25l");
}
function showCursor() {
  process.stdout.write("\x1b[?25h");
}

// --- ロゴ描画（rowsRevealed 行ぶんだけ上から見せる。xOffset で色収差の残像を作る） --
function drawLogo(grid, y, rowsRevealed, xOffset, color) {
  let x = LOGO_START_X + xOffset;
  for (const letter of LOGO_WORD) {
    const glyphRows = GLYPHS[letter];
    const w = glyphRows[0].length;
    for (let ry = 0; ry < rowsRevealed; ry++) {
      const row = glyphRows[ry];
      for (let rx = 0; rx < w; rx++) {
        if (row[rx] !== " ") setCell(grid, x + rx, y + ry, "█", color);
      }
    }
    x += w + LOGO_GAP;
  }
}

// --- Beat1-3: 星の湧き + ロゴの物質化/色収差収束 + スライド ------------------
function blockOffsetY(elapsed) {
  const [s0, s1] = BEATS.slide;
  const total = LOGO_Y_HIGH - LOGO_Y_LOW; // 負値（上へ）
  if (elapsed <= s0) return 0;
  if (elapsed >= s1) return total;
  return Math.round(total * ((elapsed - s0) / (s1 - s0)));
}
function renderStarsAndLogo(grid, elapsed, world) {
  const offsetY = blockOffsetY(elapsed);
  for (const star of world.stars) {
    if (elapsed < star.popAt) continue;
    setCell(grid, star.x, star.baseY + offsetY, star.glyph, star.glyph === "*" ? YELLOW : DIM);
  }

  if (elapsed < BEATS.logo[0]) return;
  const logoY = LOGO_Y_LOW + offsetY;
  const revealT = clamp((elapsed - BEATS.logo[0]) / (BEATS.logo[1] - BEATS.logo[0]), 0, 1);
  const rowsRevealed = elapsed >= BEATS.logo[1] ? LOGO_ROWS : Math.max(1, Math.ceil(revealT * LOGO_ROWS));
  // 最後の1/4だけ色収差の残像を持たせ、末尾フレームで一気に収束させる
  const convergeT = clamp((revealT - 0.75) / 0.25, 0, 1);
  const ghostOffset = elapsed >= BEATS.logo[1] ? 0 : Math.round(3 * (1 - convergeT));
  if (ghostOffset > 0) {
    drawLogo(grid, logoY, rowsRevealed, -ghostOffset, CYAN_DIM);
    drawLogo(grid, logoY, rowsRevealed, ghostOffset, MAGENTA_DIM);
  }
  drawLogo(grid, logoY, rowsRevealed, 0, WHITE);
}

// --- Beat4: 消失点から広がるシンセウェーブ床（近いほど明るい） --------------
function drawLine(grid, x0, y0, x1, y1, ch, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    setCell(grid, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ch, color);
  }
}
function renderFloor(grid, elapsed) {
  const t = clamp((elapsed - BEATS.grid[0]) / (BEATS.grid[1] - BEATS.grid[0]), 0, 1);
  const vx = Math.floor(COLS / 2);
  for (let i = 1; i <= FLOOR_H_LINES; i++) {
    if (t < (i - 1) / FLOOR_H_LINES) continue;
    const rowT = Math.pow(i / FLOOR_H_LINES, 1.5);
    const y = Math.round(FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * rowT);
    drawLine(grid, 4, y, COLS - 5, y, "-", i <= 2 ? DIM : CYAN);
  }
  for (let i = 0; i <= FLOOR_V_LINES; i++) {
    if (t < i / (FLOOR_V_LINES + 1)) continue;
    const bx = 4 + Math.round((i * (COLS - 8)) / FLOOR_V_LINES);
    drawLine(grid, vx, FLOOR_TOP, bx, FLOOR_BOTTOM, "·", i % 2 === 0 ? CYAN : DIM);
  }
}

// --- Beat5: 波線軌跡で右から泳ぎ去る魚群（ネオン） --------------------------
function renderFish(grid, elapsed, world) {
  const t = clamp((elapsed - BEATS.fish[0]) / (BEATS.fish[1] - BEATS.fish[0]), 0, 1);
  for (const f of world.fish) {
    const localT = clamp(t - f.startDelay, 0, 1);
    if (localT <= 0) continue;
    const x = Math.round(92 - localT * 108); // 右の画面外(92) -> 左の画面外(-16)
    const wobble = Math.round(Math.sin(localT * Math.PI * 3 + f.phase) * 1.5);
    const y = f.row + wobble;
    for (let i = 0; i < f.glyph.length; i++) setCell(grid, x + i, y, f.glyph[i], f.color);
  }
}

// --- Beat6-7: RPG会話ボックス（パカッと開く→タイプ→♥が激しく鼓動） ---------
function fillBoxInterior(grid, x, y, w, h) {
  for (let ry = 0; ry < h; ry++) {
    for (let rx = 0; rx < w; rx++) setCell(grid, x + rx, y + ry, " ", null);
  }
}
function drawBoxFrame(grid, x, y, w, h) {
  fillBoxInterior(grid, x, y, w, h); // 床/背景を透けさせない（不透明パネル）
  setText(grid, x, y, "╔" + "═".repeat(w - 2) + "╗", WHITE);
  for (let ry = 1; ry < h - 1; ry++) {
    setCell(grid, x, y + ry, "║", WHITE);
    setCell(grid, x + w - 1, y + ry, "║", WHITE);
  }
  setText(grid, x, y + h - 1, "╚" + "═".repeat(w - 2) + "╝", WHITE);
}
function renderBox(grid, elapsed) {
  const POP_MS = 250;
  const popT = clamp((elapsed - BEATS.box[0]) / POP_MS, 0, 1);
  const steps = [1, 3, 5, BOX_FULL_H];
  const h = steps[Math.min(steps.length - 1, Math.floor(popT * steps.length))];
  const y0 = BOX_CENTER_Y - Math.floor(h / 2);
  drawBoxFrame(grid, BOX_X, y0, BOX_W, h);
  if (h < BOX_FULL_H) return; // まだ「パカッ」の途中。文字は出さない

  const textStart = BEATS.box[0] + POP_MS;
  const typeT = clamp((elapsed - textStart) / (BEATS.heart[0] - textStart), 0, 1);
  const shown = BOX_TEXT_1.slice(0, Math.round(typeT * BOX_TEXT_1.length));
  setText(grid, BOX_X + 2, y0 + Math.floor(h / 2), shown, WHITE);

  if (elapsed >= BEATS.heart[0]) {
    const pulseFrame = Math.floor((elapsed - BEATS.heart[0]) / FRAME_MS);
    const bright = pulseFrame % 2 === 0;
    setCell(grid, BOX_X + BOX_W - 4, y0 + Math.floor(h / 2), "♥", bright ? MAGENTA_BOLD : DIM);
  }
}

// --- Beat8: 見せ場。全画面ノイズ→暗転→ボックスだけ残して "Hello, Player." --
function fillNoise(grid) {
  const chars = [".", ":", "*", "#", "%"];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (Math.random() < 0.72) {
        setCell(grid, x, y, chars[Math.floor(Math.random() * chars.length)], Math.random() < 0.5 ? DIM : WHITE);
      }
    }
  }
}
function renderClimax(grid, elapsedInClimax) {
  const NOISE_MS = 100;
  if (elapsedInClimax < NOISE_MS) {
    fillNoise(grid);
    return;
  }
  const y0 = BOX_CENTER_Y - Math.floor(BOX_FULL_H / 2);
  drawBoxFrame(grid, BOX_X, y0, BOX_W, BOX_FULL_H);
  setText(grid, BOX_X + 2, y0 + Math.floor(BOX_FULL_H / 2), BOX_TEXT_2, WHITE);
}

function renderFrame(grid, elapsed, world) {
  if (elapsed >= BEATS.climax[0]) {
    renderClimax(grid, elapsed - BEATS.climax[0]);
    return;
  }
  renderStarsAndLogo(grid, elapsed, world);
  if (elapsed >= BEATS.grid[0]) renderFloor(grid, elapsed);
  if (elapsed >= BEATS.fish[0] && elapsed < BEATS.fish[1]) renderFish(grid, elapsed, world);
  if (elapsed >= BEATS.box[0]) renderBox(grid, elapsed);
}

// --- 世界の初期状態（星の乱数ポップイン遅延・魚の位相） ----------------------
function makeWorld() {
  const starDur = BEATS.stars[1] - BEATS.stars[0];
  const stars = Array.from({ length: 14 }, () => ({
    x: 4 + Math.floor(Math.random() * (COLS - 8)),
    baseY: 2 + Math.floor(Math.random() * 8),
    popAt: BEATS.stars[0] + Math.random() * starDur,
    glyph: Math.random() < 0.6 ? "." : "*",
  }));
  const fishDur = (BEATS.fish[1] - BEATS.fish[0]) / 1000;
  const fish = [
    { glyph: "><>", row: 15, color: CYAN },
    { glyph: "<=>", row: 18, color: MAGENTA },
    { glyph: "><=>", row: 20, color: CYAN },
  ].map((f) => ({ ...f, phase: Math.random() * Math.PI * 2, startDelay: Math.random() * fishDur * 0.4 }));
  return { stars, fish };
}

// --- キー入力によるスキップゲート（任意のキーで即座に次へ進める） ------------
function createSkipGate() {
  let skipped = false;
  let notify = null;
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;
  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  function onKey() {
    skipped = true;
    if (notify) notify();
  }
  stdin.on("keypress", onKey);
  return {
    isSkipped: () => skipped,
    wait(ms) {
      if (skipped) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          notify = null;
          resolve();
        }, ms);
        notify = () => {
          clearTimeout(timer);
          notify = null;
          resolve();
        };
      });
    },
    cleanup() {
      stdin.removeListener("keypress", onKey);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    },
  };
}

// --- フル版（80x24以上のTTY） -----------------------------------------------
async function playSplashFull() {
  const world = makeWorld();
  const grid = makeGrid();
  const gate = createSkipGate();
  hideCursor();
  process.stdout.write("\x1b[2J\x1b[H");

  const start = Date.now();
  while (!gate.isSkipped()) {
    const elapsed = Date.now() - start;
    if (elapsed >= TOTAL_MS) break;
    clearGrid(grid);
    renderFrame(grid, elapsed, world);
    paint(grid);
    await gate.wait(FRAME_MS);
  }

  gate.cleanup();
  // 画面を綺麗に空にし、カーソルを左上に戻して終える。hello.mjs はここから通常の
  // console.log で自分の会話ボックスを描き始めるので、Beat8のボックスと「同じ座標」
  // （＝まっさらな画面の先頭）から連続しているように見える。
  process.stdout.write("\x1b[2J\x1b[H");
  showCursor();
}

// --- 簡易版（80x24未満の端末。ロゴ+ボックスだけ・絶対位置描画はしない） -------
async function playSplashSimple() {
  const gate = createSkipGate();
  hideCursor();
  console.log(`${WHITE}u m e p l a y${RESET}`);
  if (!gate.isSkipped()) await gate.wait(300);
  if (!gate.isSkipped()) {
    const w = 30;
    console.log(`${WHITE}╔${"═".repeat(w)}╗${RESET}`);
    const line = BOX_TEXT_2;
    const pad = " ".repeat(Math.max(0, w - 1 - line.length));
    console.log(`${WHITE}║ ${RESET}${line}${pad}${WHITE}║${RESET}`);
    console.log(`${WHITE}╚${"═".repeat(w)}╝${RESET}`);
    await gate.wait(200);
  }
  gate.cleanup();
  showCursor();
}

/**
 * スプラッシュを再生する。非TTY・TOYGARDEN_NO_SPLASH=1 では即 resolve（何も出さない）。
 * 80x24未満のTTYでは簡易版に degrade する。
 */
export function playSplash() {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return Promise.resolve();
  if (process.env.TOYGARDEN_NO_SPLASH === "1") return Promise.resolve();
  const cols = process.stdout.columns ?? COLS;
  const rows = process.stdout.rows ?? ROWS;
  if (cols < COLS || rows < ROWS) return playSplashSimple();
  return playSplashFull();
}

// 単体実行: `node tools/splash.mjs`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await playSplash();
  process.exit(0);
}
