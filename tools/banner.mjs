/**
 * banner.mjs — README ヒーローバナー demo/banner.gif をコードから決定論的に焼く。
 *
 *   npm run banner
 *
 * このリポジトリはスクリーンショットを1枚も含まない。バナーも @umeplay/core-termgif の
 * 自前 GIF89a エンコーダで焼く。乱数は seeded() のみ使用（同じコード → 同じバイト列）。
 *
 * renderGif() はセル格子全体に単一の pxScale しか適用できない（ロゴだけ拡大できない）ため、
 * ここでは core-termgif が公開する低レベル API（encodeGif / glyph / hasGlyph）を直接使い、
 * 要素ごとに独立した拡大率でピクセルへ焼き込む。フォントの取得元・GIFエンコーダ本体は
 * core-termgif のものをそのまま使う（自前実装しない・本体は変更しない）。
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const outFile = join(root, "demo", "banner.gif");
const tmpDir = join(root, "dist", "demos");
mkdirSync(join(root, "demo"), { recursive: true });
mkdirSync(tmpDir, { recursive: true });

async function bundle(entry, name) {
  const outfile = join(tmpDir, `${name}.mjs`);
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    tsconfig: join(root, "tsconfig.json"),
    outfile,
    logLevel: "silent",
  });
  return outfile;
}

const { encodeGif, glyph, hasGlyph, isWide, seeded } = await import(
  pathToFileURL(await bundle(join(root, "packages", "core-termgif", "src", "index.ts"), "core-termgif")).href
);

// --- キャンバス定数 -----------------------------------------------------
const WIDTH = 960;
const HEIGHT = 288;
const FPS = 6;
const FRAMES = 14;
const SCALE = 3; // 通常要素（8x8 → 24x24px）
const LOGO_SCALE = 6; // ロゴだけ2倍（8x8 → 48x48px）
const GAP = 8;
const MARGIN = 16;

// --- パレット -----------------------------------------------------------
const BG = [13, 17, 23];
const DIMFG = [110, 118, 128];
const BASE = {
  cyan: [57, 197, 207],
  green: [63, 185, 80],
  yellow: [210, 153, 34],
  magenta: [188, 140, 242],
  blue: [88, 166, 255],
};

function scaleColor(c, f) {
  return c.map((v) => Math.min(255, Math.round(v * f)));
}

const palette = [BG, DIMFG];
const colorIndex = new Map([["dim", 1]]);
let pi = 2;
for (const [name, rgb] of Object.entries(BASE)) {
  palette.push(rgb);
  colorIndex.set(name, pi++);
}
for (const [name, rgb] of Object.entries(BASE)) {
  palette.push(scaleColor(rgb, 1.3));
  colorIndex.set(`${name}-bold`, pi++);
}
for (const [name, rgb] of Object.entries(BASE)) {
  palette.push(scaleColor(rgb, 0.5));
  colorIndex.set(`${name}-dim`, pi++);
}
const C = (name) => colorIndex.get(name);

// --- グリフ描画（低レベル・座標指定） -----------------------------------
// グリフ未定義文字（=塗りつぶしブロック代替になる文字）が紛れ込んだら即 throw する。
// 過去に日本語タグラインへ漢字を使い ● 化けした事故の再発防止ガード。
function assertGlyph(ch) {
  if (ch === " ") return;
  const cp = ch.codePointAt(0);
  if (!hasGlyph(cp)) {
    throw new Error(
      `banner.mjs: グリフ未定義の文字 "${ch}" (U+${cp.toString(16).padStart(4, "0")}) はフォントに無い` +
        `（塗りつぶしブロックで代替されて表示が壊れる）。使う文字を core-termgif のフォントが持つものに差し替えること。`,
    );
  }
}

function drawGlyph(buf, x0, y0, cp, colorIdx, scale) {
  const bits = glyph(cp);
  for (let gy = 0; gy < 8; gy++) {
    const row = bits[gy];
    if (row === 0) continue;
    for (let gx = 0; gx < 8; gx++) {
      if (!(row & (1 << gx))) continue;
      const px0 = x0 + gx * scale;
      const py0 = y0 + gy * scale;
      for (let dy = 0; dy < scale; dy++) {
        const rowOff = (py0 + dy) * WIDTH;
        for (let dx = 0; dx < scale; dx++) buf[rowOff + px0 + dx] = colorIdx;
      }
    }
  }
}

function charAdvance(ch, scale) {
  return (ch !== " " && isWide(ch.codePointAt(0)) ? 16 : 8) * scale;
}

function textWidth(text, scale) {
  let w = 0;
  for (const ch of text) w += charAdvance(ch, scale);
  return w;
}

function centerX(text, scale) {
  return Math.max(0, Math.floor((WIDTH - textWidth(text, scale)) / 2));
}

/** 単色テキストを (x0,y0) から描く。 */
function drawText(buf, x0, y0, text, colorIdx, scale) {
  let x = x0;
  for (const ch of text) {
    assertGlyph(ch);
    if (ch !== " ") drawGlyph(buf, x, y0, ch.codePointAt(0), colorIdx, scale);
    x += charAdvance(ch, scale);
  }
}

/** 文字ごとに色を変えるテキスト（ロゴ用）。colors は空白以外の文字数ぶん。 */
function drawRainbowText(buf, x0, y0, text, colors, scale) {
  let x = x0;
  let ci = 0;
  for (const ch of text) {
    assertGlyph(ch);
    if (ch !== " ") {
      drawGlyph(buf, x, y0, ch.codePointAt(0), colors[ci % colors.length], scale);
      ci++;
    }
    x += charAdvance(ch, scale);
  }
}

// --- 素材（すべてフォントに実在するグリフのみで構成） -------------------
const LOGO_TEXT = "u m e p l a y"; // 文字間スペース = 字間を広げて大きく見せる
const LOGO_COLOR_NAMES = ["cyan-bold", "green-bold", "yellow-bold", "magenta-bold", "blue-bold", "cyan-bold", "green-bold"];
const LOGO_COLORS = LOGO_COLOR_NAMES.map(C);

// 「端末で遊びが生える組み立てキット」は漢字5字+カタカナを含み、core-termgif のフォントは
// font8x8 の basic/ext-latin/greek/box/block/hiragana のみを焼き込んでいて漢字を一切持たない
// （カタカナはひらがなへの音写のみ）。全文字が実グリフを持つ、意味を保ったひらがな表現に
// 差し替える（「組み立てキット」の部分は英語タグライン側で表現されるため落とす）。
const JP_TAGLINE = "たんまつで あそびが はえる";
const EN_TAGLINE = "A construction kit where terminal toys grow";

function wrapWords(text, maxWidth, scale) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(next, scale) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
const enLines = wrapWords(EN_TAGLINE, WIDTH - MARGIN * 2, SCALE);

const FISH_R = "><=>";
const FISH_L = FISH_R.split("")
  .reverse()
  .map((c) => (c === ">" ? "<" : c === "<" ? ">" : c))
  .join(""); // "<=><"
const FISH_LANE = WIDTH - textWidth(FISH_R, SCALE);

// 起動時に一度だけ検証（グリフ未定義があればここで即 throw する）
for (const text of [LOGO_TEXT, JP_TAGLINE, EN_TAGLINE, FISH_R, FISH_L, "★", "☆", "♪", "~", "-"]) {
  for (const ch of text) assertGlyph(ch);
}

// --- レイアウト（縦カーソルを流し込み、はみ出したら throw） --------------
const CELL = 8 * SCALE; // 24
const LOGO_CELL = 8 * LOGO_SCALE; // 48

let y = MARGIN;
const Y_STARS = y;
y += CELL + GAP;
const Y_NOTES = y;
y += CELL + GAP;
const Y_LOGO = y;
y += LOGO_CELL + GAP;
const Y_JP = y;
y += CELL + GAP;
const Y_EN1 = y;
y += CELL;
const Y_EN2 = y;
y += CELL + GAP;
const Y_WATER = y;
y += CELL;
const Y_FISH = y;
y += CELL + MARGIN;

if (y > HEIGHT) {
  throw new Error(`banner.mjs: レイアウトが ${y}px で 960x288 (height=${HEIGHT}) を超過している`);
}

// 星: seeded 乱数で位置・明滅位相を1回だけ決定論的に決める
const STAR_COUNT = 8;
const starRnd = seeded(20260709);
const starX = [];
const starPhase = [];
for (let i = 0; i < STAR_COUNT; i++) {
  const slot = WIDTH / STAR_COUNT;
  const base = Math.floor(i * slot);
  const jitter = Math.floor(starRnd() * (slot - CELL));
  starX.push(Math.max(0, Math.min(WIDTH - CELL, base + jitter)));
  starPhase.push(Math.floor(starRnd() * 3));
}

// 音符: ロゴの上に控えめに明滅
const NOTE_COUNT = 3;
const noteRnd = seeded(4242);
const noteX = [];
const notePhase = [];
for (let i = 0; i < NOTE_COUNT; i++) {
  noteX.push(MARGIN + Math.floor(noteRnd() * (WIDTH - MARGIN * 2 - CELL)));
  notePhase.push(Math.floor(noteRnd() * 5));
}

// --- 静的レイヤー（毎フレーム同一なので1回だけ描く） ---------------------
const staticBuf = new Uint8Array(WIDTH * HEIGHT);
drawRainbowText(staticBuf, centerX(LOGO_TEXT, LOGO_SCALE), Y_LOGO, LOGO_TEXT, LOGO_COLORS, LOGO_SCALE);
drawText(staticBuf, centerX(JP_TAGLINE, SCALE), Y_JP, JP_TAGLINE, C("dim"), SCALE);
drawText(staticBuf, centerX(enLines[0], SCALE), Y_EN1, enLines[0], C("dim"), SCALE);
if (enLines[1]) drawText(staticBuf, centerX(enLines[1], SCALE), Y_EN2, enLines[1], C("dim"), SCALE);

// --- フレーム構築（動くレイヤーだけ static の上に重ねる） -----------------
function buildFrame(f) {
  const buf = staticBuf.slice();

  // 星のきらめき
  starX.forEach((x, i) => {
    const phase = (f + starPhase[i]) % 3;
    if (phase === 0) drawGlyph(buf, x, Y_STARS, "★".codePointAt(0), C("yellow"), SCALE);
    else if (phase === 1) drawGlyph(buf, x, Y_STARS, "☆".codePointAt(0), C("yellow-dim"), SCALE);
  });

  // 音符の明滅
  noteX.forEach((x, i) => {
    if ((f + notePhase[i]) % 5 < 2) drawGlyph(buf, x, Y_NOTES, "♪".codePointAt(0), C("magenta-dim"), SCALE);
  });

  // 水面ライン
  for (let c = 0; c * 8 * SCALE < WIDTH; c++) {
    const ch = (c + f) % 2 === 0 ? "~" : "-";
    drawGlyph(buf, c * 8 * SCALE, Y_WATER, ch.codePointAt(0), C("blue-dim"), SCALE);
  }

  // すれ違う2匹の魚
  const xr = f % FISH_LANE;
  const xl = FISH_LANE - (f % FISH_LANE);
  drawText(buf, xr, Y_FISH, FISH_R, C("cyan"), SCALE);
  drawText(buf, xl, Y_FISH, FISH_L, C("green"), SCALE);

  return { indices: buf, delayCs: Math.max(2, Math.round(100 / FPS)) };
}

const frames = Array.from({ length: FRAMES }, (_, f) => buildFrame(f));
const gif = encodeGif(WIDTH, HEIGHT, palette, frames);
writeFileSync(outFile, gif);

const kb = Math.round(statSync(outFile).size / 1024);
console.log(`OK demo/banner.gif  ${WIDTH}x${HEIGHT}  ${FRAMES}f @${FPS}fps  ${kb}KB  logo x${LOGO_SCALE} (others x${SCALE})`);
