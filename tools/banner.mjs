/**
 * banner.mjs — README ヒーローバナー demo/banner.gif をコードから決定論的に焼く。
 *
 *   npm run banner
 *
 * コンセプト: 「RPGの会話ボックスの中で、ターミナルおもちゃの住人たちがネオンに光りながら
 * 動いている」画。umeplay は21本のターミナルおもちゃのキットなので、その住人たち（水槽の
 * 魚群・chiptune の音符・agent-constellation の星座線・tamagotchi の顔）がバナーの中で
 * 同時に生きて動いている「パレード」に、Undertale 風の会話ボックス・ピクセルハート・
 * シンセウェーブ風ネオングリッドを重ねる。
 *
 * このリポジトリはスクリーンショットを1枚も含まない。バナーも @umeplay/core-termgif の
 * 自前 GIF89a エンコーダで焼く。乱数は seeded() のみ使用（同じコード → 同じバイト列）。
 *
 * renderGif() はセル格子全体に単一の pxScale しか適用できない（ロゴだけ拡大できない）ため、
 * ここでは core-termgif が公開する低レベル API（encodeGif / glyph / hasGlyph）を直接使い、
 * 要素ごとに独立した拡大率でピクセルへ焼き込む。フォントの取得元・GIFエンコーダ本体は
 * core-termgif のものをそのまま使う（自前実装しない・本体は変更しない）。
 * ハート・会話ボックスの枠・ネオングリッドはフォント文字ではなく矩形塗り（rect合成）の
 * 自作スプライトなので assertGlyph の対象外（フォント制約を受けない）。
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
const HEIGHT_MIN = 288;
const HEIGHT_MAX = 384;
const FPS = 8;
const FRAMES = 24;
const SCALE = 3; // 主要素（8x8 → 24x24px）: タグライン・魚・水面・顔
const SCALE_LOGO = 6; // ロゴだけ2倍（8x8 → 48x48px）
const SCALE_TINY = 2; // 密度担当の細かい要素（8x8 → 16x16px）: 星・音符・泡・星座線
const SCALE_BOX = 2; // 会話ボックス内のテキスト（8x8 → 16x16px）
const GAP = 6;
const MARGIN = 10;

// --- パレット -----------------------------------------------------------
const BG = [13, 17, 23];
const DIMFG = [110, 118, 128];
const WHITE = [235, 240, 245];
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
palette.push(WHITE);
colorIndex.set("white", pi++);
palette.push(scaleColor(WHITE, 0.6));
colorIndex.set("white-dim", pi++);
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

/** フォント側に太字がないので1pxずらして二度描く疑似ボールド（主役タグライン用）。 */
function drawTextBold(buf, x0, y0, text, colorIdx, scale) {
  drawText(buf, x0, y0, text, colorIdx, scale);
  drawText(buf, x0 + 1, y0, text, colorIdx, scale);
}

/** 文字ごとに色を変えるテキスト（ロゴ用）。colors は空白以外の文字数ぶん。開始 index を回すと色が流れる。 */
function drawRainbowText(buf, x0, y0, text, colors, scale, colorOffset = 0) {
  let x = x0;
  let ci = 0;
  for (const ch of text) {
    assertGlyph(ch);
    if (ch !== " ") {
      drawGlyph(buf, x, y0, ch.codePointAt(0), colors[(ci + colorOffset) % colors.length], scale);
      ci++;
    }
    x += charAdvance(ch, scale);
  }
}

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

// --- rect 合成プリミティブ（ハート・会話ボックス枠・ネオングリッド用。フォント制約を受けない） --
function fillRect(buf, x0, y0, w, h, colorIdx) {
  for (let yy = Math.max(0, y0); yy < Math.min(HEIGHT, y0 + h); yy++) {
    const rowOff = yy * WIDTH;
    for (let xx = Math.max(0, x0); xx < Math.min(WIDTH, x0 + w); xx++) buf[rowOff + xx] = colorIdx;
  }
}

/** 二重枠（Undertale風の会話ボックス）。外枠→内側1px空けて内枠、の順で描く。 */
function drawDoubleBox(buf, x0, y0, w, h, colorIdx) {
  const OUTER = 3;
  const GAP_PX = 3;
  const INNER = 2;
  fillRect(buf, x0, y0, w, OUTER, colorIdx); // top outer
  fillRect(buf, x0, y0 + h - OUTER, w, OUTER, colorIdx); // bottom outer
  fillRect(buf, x0, y0, OUTER, h, colorIdx); // left outer
  fillRect(buf, x0 + w - OUTER, y0, OUTER, h, colorIdx); // right outer
  const ix = x0 + OUTER + GAP_PX;
  const iy = y0 + OUTER + GAP_PX;
  const iw = w - (OUTER + GAP_PX) * 2;
  const ih = h - (OUTER + GAP_PX) * 2;
  fillRect(buf, ix, iy, iw, INNER, colorIdx); // top inner
  fillRect(buf, ix, iy + ih - INNER, iw, INNER, colorIdx); // bottom inner
  fillRect(buf, ix, iy, INNER, ih, colorIdx); // left inner
  fillRect(buf, ix + iw - INNER, iy, INNER, ih, colorIdx); // right inner
  return { OUTER, GAP_PX, INNER, overhead: OUTER + GAP_PX + INNER };
}

// ピクセルハート（8x7・rect合成の自作スプライト。フォントに ♥ はあるが会話ボックスの
// カーソル演出は「1px膨張の鼓動」を自前で制御したいためビットマップから直接焼く）。
const HEART_BITMAP = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];
function drawHeart(buf, x0, y0, px, colorIdx) {
  for (let ry = 0; ry < HEART_BITMAP.length; ry++) {
    const row = HEART_BITMAP[ry];
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === "1") fillRect(buf, x0 + rx * px, y0 + ry * px, px, px, colorIdx);
    }
  }
}
function heartWidth(px) {
  return HEART_BITMAP[0].length * px;
}
function heartHeight(px) {
  return HEART_BITMAP.length * px;
}

/** 直線（グリッド・星座線用の汎用ステッパー）。 */
function drawLinePx(buf, x0, y0, x1, y1, colorIdx, thickness = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    fillRect(buf, x, y, thickness, thickness, colorIdx);
  }
}

// --- 素材（フォント経由のテキストは全てフォントに実在するグリフのみで構成） -------------------
const LOGO_TEXT = "u m e p l a y"; // 文字間スペース = 字間を広げて大きく見せる
const LOGO_COLOR_NAMES = ["cyan-bold", "green-bold", "yellow-bold", "magenta-bold", "blue-bold", "cyan-bold", "green-bold"];
const LOGO_COLORS = LOGO_COLOR_NAMES.map(C);

// 「端末で遊びが生える組み立てキット」は漢字5字+カタカナを含み、core-termgif のフォントは
// font8x8 の basic/ext-latin/greek/box/block/hiragana のみを焼き込んでいて漢字を一切持たない
// （カタカナはひらがなへの音写のみ）。全文字が実グリフを持つ、意味を保ったひらがな表現を使う
// （「組み立てキット」の部分は英語タグライン側で表現されるため落とす）。
// v4（2026-07-08 human裁定）: 海外オーディエンス主想定のため主役を英語に反転。
// ENタグラインを主見出しに、ひらがなは「ひらがなが泳ぐ端末」という海外勢へのチャームポイントとして
// 小さく1行だけ残す（消さない）。
const JP_TAGLINE = "たんまつで あそびが はえる";
const EN_TAGLINE = "A construction kit where terminal toys grow";
const enLines = wrapWords(EN_TAGLINE, WIDTH - MARGIN * 2, SCALE);

// Undertale 風コマンド行のパロディ。本場が英語圏の演出なので英語に統一（本物度が上がる）。
// "BUILD" を選択中という体でハートカーソルを添える。
const COMMAND_WORDS = ["PLAY", "BUILD", "WATCH"];
const COMMAND_CURSOR_INDEX = 1;

// 魚群（ascii-aquarium 由来のモチーフ・大小3種）。flip() で右向き→左向きを作る。
function flipFish(s) {
  return s
    .split("")
    .reverse()
    .map((c) => (c === ">" ? "<" : c === "<" ? ">" : c))
    .join("");
}
const FISH_KINDS_R = ["><>", "><=>", "><==>"];
const FISH_KINDS_L = FISH_KINDS_R.map(flipFish);

// たまごっちの顔（うめこ）。かおもじ記号（ω・▽等）はフォント未収録のため使わず ASCII のみ。
const FACE_OPEN = "(V@V)";
const FACE_BLINK = "(V_V)";

// 天気（desk-weather）のミニ・ヴィネット。星座の★☆をひとまわり大きく単独表示して
// 「くもり⇄はれ」を表現する。
const WEATHER_CLOUDY = "☆";
const WEATHER_SUNNY = "★";

// 起動時に一度だけ検証（グリフ未定義があればここで即 throw する）
for (const text of [
  LOGO_TEXT,
  JP_TAGLINE,
  EN_TAGLINE,
  ...COMMAND_WORDS,
  "*",
  ...FISH_KINDS_R,
  ...FISH_KINDS_L,
  FACE_OPEN,
  FACE_BLINK,
  WEATHER_CLOUDY,
  WEATHER_SUNNY,
  "♪",
  "~",
  "-",
  ".",
  "(",
  ")",
]) {
  for (const ch of text) assertGlyph(ch);
}

// --- レイアウト（縦カーソルを流し込み、最終高さを 288〜384 に収める） ----
const CELL = 8 * SCALE; // 24
const CELL_TINY = 8 * SCALE_TINY; // 16
const CELL_BOX = 8 * SCALE_BOX; // 16
const LOGO_CELL = 8 * SCALE_LOGO; // 48
const SKY_HEIGHT = 56; // 星・音符・星座線・天気ヴィネットが同居する帯

// 会話ボックスの寸法を先に計算する（内容から逆算。オーバーヘッドを手で仮置きしない）。
// ENタグラインは主見出し側に昇格したため、ボックス内はコマンド行のみ。
const BOX_WIDTH = WIDTH - MARGIN * 2 - 32;
const BOX_X = Math.floor((WIDTH - BOX_WIDTH) / 2);
const BOX_PAD = 10;
const HEART_PX = 3;
const BOX_BORDER_OVERHEAD = 3 + 3 + 2; // drawDoubleBox の OUTER+GAP_PX+INNER
const BOX_COMMAND_H = Math.max(CELL_BOX, heartHeight(HEART_PX));
const BOX_HEIGHT = BOX_BORDER_OVERHEAD * 2 + BOX_PAD * 2 + BOX_COMMAND_H;

const GRID_HEIGHT = 30;

let y = MARGIN;
const Y_SKY = y;
y += SKY_HEIGHT + GAP;
const Y_LOGO = y;
y += LOGO_CELL + GAP;
const Y_EN1 = y;
y += CELL;
const Y_EN2 = y;
y += CELL + GAP;
const Y_JP = y;
y += CELL_BOX + GAP;
const Y_WATER = y;
y += CELL;
const Y_FISH1 = y;
y += CELL;
const Y_FISH2 = y;
y += CELL + GAP;
const Y_BOX = y;
y += BOX_HEIGHT + GAP;
const Y_GRID = y;
y += GRID_HEIGHT + MARGIN;

const HEIGHT = y;
if (HEIGHT < HEIGHT_MIN || HEIGHT > HEIGHT_MAX) {
  throw new Error(
    `banner.mjs: レイアウト計算後の高さ ${HEIGHT}px が許容範囲 ${HEIGHT_MIN}〜${HEIGHT_MAX}px を外れている`,
  );
}

// --- 星座（agent-constellation 由来）: 星を散らし、2組だけ dispatch 線でつなぐ ---
const SKY_COLS = Math.floor((WIDTH - MARGIN * 2) / CELL_TINY);
const SKY_ROWS = Math.floor(SKY_HEIGHT / CELL_TINY);
const STAR_COUNT = 16;
const starRnd = seeded(20260709);
const starCell = []; // [col, row]
const starPhase = [];
for (let i = 0; i < STAR_COUNT; i++) {
  starCell.push([Math.floor(starRnd() * SKY_COLS), Math.floor(starRnd() * SKY_ROWS)]);
  starPhase.push(Math.floor(starRnd() * 3));
}
function starPx([col, row]) {
  return [MARGIN + col * CELL_TINY, Y_SKY + row * CELL_TINY];
}
const DISPATCH_LINKS = [
  [0, 1],
  [2, 3],
];
function lineCells([c0, r0], [c1, r1]) {
  const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  const pts = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    pts.push([Math.round(c0 + (c1 - c0) * t), Math.round(r0 + (r1 - r0) * t)]);
  }
  return pts;
}

// 音符（chiptune 由来）: 湧いて上る。frame とともに y が減り、下端へループする。
const NOTE_COUNT = 6;
const noteRnd = seeded(4242);
const noteX = [];
const notePhase = [];
for (let i = 0; i < NOTE_COUNT; i++) {
  noteX.push(MARGIN + Math.floor(noteRnd() * (WIDTH - MARGIN * 2 - CELL_TINY)));
  notePhase.push(Math.floor(noteRnd() * SKY_ROWS * 3));
}
const NOTE_RISE_RANGE = SKY_HEIGHT - CELL_TINY;

// 泡（aquarium 由来）: 水槽帯の中を静かに上る。
const BUBBLE_COUNT = 5;
const bubbleRnd = seeded(777);
const bubbleX = [];
const bubblePhase = [];
for (let i = 0; i < BUBBLE_COUNT; i++) {
  bubbleX.push(MARGIN + Math.floor(bubbleRnd() * (WIDTH - MARGIN * 2 - CELL_TINY)));
  bubblePhase.push(Math.floor(bubbleRnd() * 12));
}
const AQUARIUM_HEIGHT = Y_FISH2 + CELL - Y_WATER;
const BUBBLE_RISE_RANGE = AQUARIUM_HEIGHT - CELL_TINY;

// 魚群: 2レーンに2匹ずつ、大きさ・向き・色をばらけさせる。速度はレーン長×FRAMES基準の
// 相対値にする（絶対px/frameだと24フレームのループ内でほとんど動かず重なって見える事故が
// 実測で発生したため。0..1 の位相を frame 進行に足して % 1 する方式で滑らかにループさせる）。
const fishRnd = seeded(99);
const FISH_LANES = [Y_FISH1, Y_FISH2];
const FISH_COLOR_NAMES = ["cyan", "green", "blue"];
const fishes = [];
for (let lane = 0; lane < FISH_LANES.length; lane++) {
  for (let n = 0; n < 2; n++) {
    const kind = Math.floor(fishRnd() * FISH_KINDS_R.length);
    const dir = fishRnd() < 0.5 ? 1 : -1;
    const speedFactor = 1.3 + fishRnd() * 1.2; // ループ中に1.3〜2.5周ぶん泳ぐ
    let phaseFraction = fishRnd();
    if (n === 1) phaseFraction = (phaseFraction + 0.5) % 1; // 同レーンの相方とは逆位相スタート（重なり回避）
    const color = FISH_COLOR_NAMES[Math.floor(fishRnd() * FISH_COLOR_NAMES.length)];
    fishes.push({ y: FISH_LANES[lane], kind, dir, speedFactor, phaseFraction, color });
  }
}

// 海藻（aquarium 由来）: 水面のすぐ下、左右の縁で揺れる。
const SEAWEED_X = [MARGIN + CELL, WIDTH - MARGIN - CELL * 2, Math.floor(WIDTH / 2) - CELL * 6];

// 顔＋鼓動ハート: 水槽帯の左肩に小さく同居させる（専用の帯を持たずスペースを節約）。
const FACE_X = MARGIN;
const FACE_Y = Y_FISH1 - CELL - 2;
const HEART_BEAT_X = FACE_X + textWidth(FACE_OPEN, SCALE) + 8;
const HEART_BEAT_Y = FACE_Y + 4;

// 会話ボックス内のコマンド行を組み立てる（ハートは矩形合成・文字とは別扱い）。
function commandRowWidth() {
  let w = 0;
  for (let i = 0; i < COMMAND_WORDS.length; i++) {
    w += i === COMMAND_CURSOR_INDEX ? heartWidth(HEART_PX) : textWidth("*", SCALE_BOX);
    w += 6; // bullet と単語の間
    w += textWidth(COMMAND_WORDS[i], SCALE_BOX);
    if (i < COMMAND_WORDS.length - 1) w += 20; // 単語間の間隔
  }
  return w;
}
const COMMAND_ROW_WIDTH = commandRowWidth();

// --- ネオングリッド床（シンセウェーブ風の遠近グリッド） -------------------
const GRID_VX = WIDTH / 2;
const GRID_VY = Y_GRID;
const GRID_BOTTOM = Y_GRID + GRID_HEIGHT;
const GRID_HLINES = 4;
const GRID_VLINES = 9;

// --- 静的レイヤー（毎フレーム同一なので1回だけ描く） ---------------------
// v4: ENタグラインを主見出し(太字白・2行)に、ひらがなは小さく1行だけ(海外勢へのチャームポイント)。
const staticBuf = new Uint8Array(WIDTH * HEIGHT);
drawTextBold(staticBuf, centerX(enLines[0], SCALE), Y_EN1, enLines[0], C("white"), SCALE);
if (enLines[1]) drawTextBold(staticBuf, centerX(enLines[1], SCALE), Y_EN2, enLines[1], C("white"), SCALE);
drawText(staticBuf, centerX(JP_TAGLINE, SCALE_BOX), Y_JP, JP_TAGLINE, C("dim"), SCALE_BOX);

// --- フレーム構築 ---------------------------------------------------------
function buildFrame(f) {
  const buf = staticBuf.slice();

  // 星座: 星のきらめき
  starCell.forEach((cell, i) => {
    const [x, py] = starPx(cell);
    const phase = (f + starPhase[i]) % 3;
    if (phase === 0) drawGlyph(buf, x, py, "★".codePointAt(0), C("yellow"), SCALE_TINY);
    else if (phase === 1) drawGlyph(buf, x, py, "☆".codePointAt(0), C("yellow-dim"), SCALE_TINY);
  });
  // dispatch 線
  for (const [a, b] of DISPATCH_LINKS) {
    for (const cell of lineCells(starCell[a], starCell[b])) {
      const [x, py] = starPx(cell);
      drawGlyph(buf, x, py, ".".codePointAt(0), C("cyan-dim"), SCALE_TINY);
    }
  }

  // 天気ヴィネット: 右上でくもり⇄はれを切り替える
  const weatherX = WIDTH - MARGIN - CELL;
  const sunny = f % FRAMES >= FRAMES / 2;
  drawGlyph(
    buf,
    weatherX,
    Y_SKY,
    (sunny ? WEATHER_SUNNY : WEATHER_CLOUDY).codePointAt(0),
    C(sunny ? "yellow-bold" : "dim"),
    SCALE,
  );

  // 音符: 湧いて上る
  noteX.forEach((x, i) => {
    const rise = (f * 3 + notePhase[i]) % NOTE_RISE_RANGE;
    const py = Y_SKY + SKY_HEIGHT - CELL_TINY - rise;
    drawGlyph(buf, x, py, "♪".codePointAt(0), C("magenta-dim"), SCALE_TINY);
  });

  // ロゴ: 色収差風の残像（シアン/マゼンタを数px オフセットで下敷きにしてから本体を描く）＋ color wave
  const lx = centerX(LOGO_TEXT, SCALE_LOGO);
  drawRainbowText(buf, lx - 3, Y_LOGO, LOGO_TEXT, [C("cyan-dim")], SCALE_LOGO, 0);
  drawRainbowText(buf, lx + 3, Y_LOGO + 1, LOGO_TEXT, [C("magenta-dim")], SCALE_LOGO, 0);
  drawRainbowText(buf, lx, Y_LOGO, LOGO_TEXT, LOGO_COLORS, SCALE_LOGO, f);

  // うめこの顔: たまに瞬き＋そばで鼓動するハート
  const face = f % 8 === 0 ? FACE_BLINK : FACE_OPEN;
  drawText(buf, FACE_X, FACE_Y, face, C("magenta-bold"), SCALE);
  const beatPx = f % 8 < 4 ? HEART_PX : HEART_PX + 1;
  drawHeart(buf, HEART_BEAT_X, HEART_BEAT_Y - (beatPx - HEART_PX), beatPx, C("magenta"));

  // 水面ライン
  for (let c = 0; c * 8 * SCALE < WIDTH; c++) {
    const ch = (c + f) % 2 === 0 ? "~" : "-";
    drawGlyph(buf, c * 8 * SCALE, Y_WATER, ch.codePointAt(0), C("blue-dim"), SCALE);
  }

  // 海藻: 左右で揺れる
  SEAWEED_X.forEach((x, i) => {
    const ch = (f + i) % 2 === 0 ? "(" : ")";
    drawGlyph(buf, x, Y_WATER - 4, ch.codePointAt(0), C("green-dim"), SCALE);
  });

  // 泡: 水槽帯の中を上る
  bubbleX.forEach((x, i) => {
    const rise = (f * 2 + bubblePhase[i]) % BUBBLE_RISE_RANGE;
    const py = Y_WATER + AQUARIUM_HEIGHT - CELL_TINY - rise;
    drawGlyph(buf, x, py, ".".codePointAt(0), C("cyan-dim"), SCALE_TINY);
  });

  // 魚群: 波線の上を大小・向き違いの魚がすれ違う
  for (const fish of fishes) {
    const str = fish.dir === 1 ? FISH_KINDS_R[fish.kind] : FISH_KINDS_L[fish.kind];
    const lane = WIDTH - textWidth(str, SCALE);
    const progress = (f / FRAMES) * fish.speedFactor + fish.phaseFraction;
    const frac = progress - Math.floor(progress);
    const step = Math.round(frac * lane);
    const x = fish.dir === 1 ? step : lane - step;
    drawText(buf, x, fish.y, str, C(fish.color), SCALE);
  }

  // RPG 会話ボックス: 白の二重枠 + コマンド行（ハートカーソル付き）。ENタグラインは
  // v4 で主見出し側に昇格したためボックス内には置かない。
  drawDoubleBox(buf, BOX_X, Y_BOX, BOX_WIDTH, BOX_HEIGHT, C("white"));
  const innerY0 = Y_BOX + BOX_BORDER_OVERHEAD + BOX_PAD;
  let cx = BOX_X + Math.floor((BOX_WIDTH - COMMAND_ROW_WIDTH) / 2);
  const cy = innerY0;
  for (let i = 0; i < COMMAND_WORDS.length; i++) {
    if (i === COMMAND_CURSOR_INDEX) {
      const cursorBeat = f % 8 < 4 ? HEART_PX : HEART_PX + 1;
      drawHeart(buf, cx, cy - (cursorBeat - HEART_PX), cursorBeat, C("magenta"));
      cx += heartWidth(HEART_PX);
    } else {
      drawText(buf, cx, cy, "*", C("white-dim"), SCALE_BOX);
      cx += textWidth("*", SCALE_BOX);
    }
    cx += 6;
    drawText(buf, cx, cy, COMMAND_WORDS[i], C("white"), SCALE_BOX);
    cx += textWidth(COMMAND_WORDS[i], SCALE_BOX);
    if (i < COMMAND_WORDS.length - 1) cx += 20;
  }

  // ネオングリッド床（シンセウェーブ風の遠近グリッド。水平線は上ほど密に）
  for (let i = 1; i <= GRID_HLINES; i++) {
    const t = Math.pow(i / GRID_HLINES, 1.6);
    const gy = Math.round(GRID_VY + (GRID_BOTTOM - GRID_VY) * t);
    const color = i <= 2 ? "cyan-dim" : "magenta-dim";
    drawLinePx(buf, MARGIN, gy, WIDTH - MARGIN, gy, C(color), 1);
  }
  for (let i = 0; i <= GRID_VLINES; i++) {
    const bx = MARGIN + (i * (WIDTH - MARGIN * 2)) / GRID_VLINES;
    const color = i % 2 === 0 ? "cyan-dim" : "magenta-dim";
    drawLinePx(buf, GRID_VX, GRID_VY, bx, GRID_BOTTOM, C(color), 1);
  }

  return { indices: buf, delayCs: Math.max(2, Math.round(100 / FPS)) };
}

const frames = Array.from({ length: FRAMES }, (_, f) => buildFrame(f));
const gif = encodeGif(WIDTH, HEIGHT, palette, frames);
writeFileSync(outFile, gif);

const kb = Math.round(statSync(outFile).size / 1024);
console.log(
  `OK demo/banner.gif  ${WIDTH}x${HEIGHT}  ${FRAMES}f @${FPS}fps  ${kb}KB  logo x${SCALE_LOGO} (others x${SCALE}, tiny x${SCALE_TINY}, box x${SCALE_BOX})`,
);
