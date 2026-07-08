/**
 * diagram.mjs — 「キットの仕組み」を1枚のアニメ図解 demo/how-it-works.gif に焼く。
 *
 *   npm run diagram
 *
 * banner.mjs と同じ流儀: core-termgif の低レベル API（encodeGif / glyph / hasGlyph）を
 * 直接使い、要素を pixel 座標で自前レイアウトする（renderGif の等倍セル格子は使わない）。
 * フォントに絵文字（🐟 ☀ など）は無いため、ASCII のみで「魚 / 天気 / 音符」を表現する。
 *
 * 図解: 1個の PlayEvent（task.done）が producer → EventBus → 3つの独立 consumer
 * （aquarium / desk-weather / chiptune）へ同時に配達される。consumer 同士は互いを
 * 知らない（contracts/events.ts の Producer/Consumer 疎結合そのもの）。
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const outFile = join(root, "demo", "how-it-works.gif");
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

const { encodeGif, glyph, hasGlyph, isWide } = await import(
  pathToFileURL(await bundle(join(root, "packages", "core-termgif", "src", "index.ts"), "core-termgif")).href
);

// --- キャンバス定数 -----------------------------------------------------
const WIDTH = 960;
const HEIGHT = 336;
const SCALE = 2;
const CELL = 8 * SCALE; // 16px
const MARGIN = 24;
const GAP_V = 16;

const FPS = 10;
const DELAY_CS = Math.max(2, Math.round(100 / FPS));

// --- パレット -----------------------------------------------------------
const BG = [13, 17, 23];
const DIM_BORDER = [88, 96, 105];
const FG = [201, 209, 217];
const BASE = {
  cyan: [57, 197, 207], // aquarium
  blue: [88, 166, 255], // weather: cloud
  yellow: [210, 153, 34], // weather: sun
  magenta: [188, 140, 242], // chiptune
  green: [63, 185, 80], // event / bus flow
};

function scaleColor(c, f) {
  return c.map((v) => Math.min(255, Math.round(v * f)));
}

const palette = [BG, DIM_BORDER, FG];
const colorIndex = new Map([
  ["dim", 1],
  ["fg", 2],
]);
let pi = 3;
for (const [name, rgb] of Object.entries(BASE)) {
  palette.push(rgb);
  colorIndex.set(name, pi++);
}
for (const [name, rgb] of Object.entries(BASE)) {
  palette.push(scaleColor(rgb, 1.3));
  colorIndex.set(`${name}-bold`, pi++);
}
for (const [name, rgb] of Object.entries(BASE)) {
  palette.push(scaleColor(rgb, 0.45));
  colorIndex.set(`${name}-dim`, pi++);
}
const C = (name) => colorIndex.get(name);

// --- 低レベル描画（banner.mjs と同じ流儀） -------------------------------
// グリフ未定義文字（塗りつぶしブロック代替）が紛れ込んだら即 throw する。
function assertGlyph(ch) {
  if (ch === " ") return;
  const cp = ch.codePointAt(0);
  if (!hasGlyph(cp)) {
    throw new Error(
      `diagram.mjs: グリフ未定義の文字 "${ch}" (U+${cp.toString(16).padStart(4, "0")}) はフォントに無い` +
        `（塗りつぶしブロックで代替されて表示が壊れる）。絵文字は使えない（🐟 ☀ など）。`,
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

function drawText(buf, x0, y0, text, colorIdx, scale) {
  let x = x0;
  for (const ch of text) {
    assertGlyph(ch);
    if (ch !== " ") drawGlyph(buf, x, y0, ch.codePointAt(0), colorIdx, scale);
    x += charAdvance(ch, scale);
  }
  return x;
}

function centerX(text, scale) {
  return Math.max(0, Math.floor((WIDTH - textWidth(text, scale)) / 2));
}

// --- 罫線・コネクタ -------------------------------------------------------
function hline(buf, x0, y0, cols, ch, colorIdx, scale) {
  for (let i = 0; i < cols; i++) drawGlyph(buf, x0 + i * 8 * scale, y0, ch.codePointAt(0), colorIdx, scale);
}
function vline(buf, x0, y0, rows, ch, colorIdx, scale) {
  for (let i = 0; i < rows; i++) drawGlyph(buf, x0, y0 + i * 8 * scale, ch.codePointAt(0), colorIdx, scale);
}

// --- ボックス（罫線 + テキスト） ------------------------------------------
// innerCols: 内側テキスト幅（文字数）。rows: [{ text, color }] または [{ segments:[{text,color}] }]。
function drawBox(buf, x0, y0, innerCols, rows, borderColorIdx, scale) {
  const cellW = 8 * scale;
  const border = "+" + "-".repeat(innerCols) + "+";
  drawText(buf, x0, y0, border, borderColorIdx, scale);
  rows.forEach((row, i) => {
    const ry = y0 + (i + 1) * cellW;
    drawGlyph(buf, x0, ry, "|".codePointAt(0), borderColorIdx, scale);
    let used = 0;
    let x = x0 + cellW;
    const segments = row.segments ?? [{ text: row.text, color: row.color }];
    for (const seg of segments) {
      used += seg.text.length;
      if (used > innerCols) {
        throw new Error(`diagram.mjs: box row overflow "${seg.text}" (used=${used} > innerCols=${innerCols})`);
      }
      x = drawText(buf, x, ry, seg.text, seg.color, scale);
    }
    drawGlyph(buf, x0 + cellW * (innerCols + 1), ry, "|".codePointAt(0), borderColorIdx, scale);
  });
  const by = y0 + (rows.length + 1) * cellW;
  drawText(buf, x0, by, border, borderColorIdx, scale);
}

// --- レイアウト（pixel 座標を直接固定。はみ出したら throw） --------------
const PRODUCER_INNER = 11; // "producer" / "task.done" 用
const CONSUMER_INNER = 13; // 3 consumer 共通幅（右端を揃える）
const PRODUCER_W = (PRODUCER_INNER + 2) * CELL; // 208
const CONSUMER_W = (CONSUMER_INNER + 2) * CELL; // 240
const BOX_H = 4 * CELL; // border+title+content+border = 64

const AQUA_Y = MARGIN; // 24
const AQUA_CENTER = AQUA_Y + BOX_H / 2; // 56
const WEATHER_Y = AQUA_Y + BOX_H + GAP_V; // 104
const WEATHER_CENTER = WEATHER_Y + BOX_H / 2; // 136
const CHIP_Y = WEATHER_Y + BOX_H + GAP_V; // 184
const CHIP_CENTER = CHIP_Y + BOX_H / 2; // 216
const STACK_BOTTOM = CHIP_Y + BOX_H; // 248

const PRODUCER_Y = WEATHER_CENTER - BOX_H / 2; // 104（weather と同じ行に揃える）
const PRODUCER_X = MARGIN;
const PRODUCER_RIGHT = PRODUCER_X + PRODUCER_W; // 232

const CONSUMER_X = WIDTH - MARGIN - CONSUMER_W; // 696

const BUS_COLS = 20; // producer -> junction（pulse が走る区間）
const BUS_LEN = BUS_COLS * CELL; // 320
const JX = PRODUCER_RIGHT + BUS_LEN; // 552（分岐の縦串）
const ARM_COLS = (CONSUMER_X - JX) / CELL; // 9（縦串 -> 各 consumer）
if (!Number.isInteger(ARM_COLS)) throw new Error("diagram.mjs: ARM_COLS が整数でない（レイアウト崩れ）");

const EVENTBUS_LABEL = "EventBus";
const EVENTBUS_LABEL_X = Math.round((PRODUCER_RIGHT + JX) / 2 - textWidth(EVENTBUS_LABEL, SCALE) / 2);
const EVENTBUS_LABEL_Y = WEATHER_CENTER - CELL - 4;

const CAPTION = "one event, three toys - nobody knows each other";
const CAPTION_GAP = 32;
const CAPTION_Y = STACK_BOTTOM + CAPTION_GAP; // 280
const BOTTOM_MARGIN = 40;
const COMPUTED_HEIGHT = CAPTION_Y + CELL + BOTTOM_MARGIN; // 336

if (COMPUTED_HEIGHT !== HEIGHT) {
  throw new Error(`diagram.mjs: レイアウト高さ ${COMPUTED_HEIGHT} が HEIGHT=${HEIGHT} と食い違う`);
}
if (CONSUMER_X + CONSUMER_W !== WIDTH - MARGIN) {
  throw new Error("diagram.mjs: consumer box が右マージンからずれている");
}

// --- フレーズ (タイムライン) ----------------------------------------------
// A: producer -> junction へ pulse が流れる（NA フレーム）
// B: junction 到達 -> 3 consumer が同一フレームで反応、コネクタ点灯（NB フレーム）
// C: 反応が収まり静かな間（NC フレーム）-> ループして A へ
const NA = 11;
const NB = 6;
const NC = 3;
const TOTAL = NA + NB + NC;

function phaseOf(f) {
  if (f < NA) return { phase: "A", i: f };
  if (f < NA + NB) return { phase: "B", i: f - NA };
  return { phase: "C", i: f - NA - NB };
}

// --- 静的文字列（毎フレーム同じ部分は使い回す） ---------------------------
for (const ch of `${EVENTBUS_LABEL}${CAPTION}producertaskdonaquariumweathercloudsunchiptunenote`) assertGlyph(ch);
assertGlyph("●");
assertGlyph("♪");

function buildFrame(f) {
  const buf = new Uint8Array(WIDTH * HEIGHT); // 0 = bg
  const { phase, i } = phaseOf(f);

  const traveling = phase === "A";
  const reacting = phase === "B";
  const emitFlash = phase === "A" && i < 2;

  // --- producer box ---
  drawBox(
    buf,
    PRODUCER_X,
    PRODUCER_Y,
    PRODUCER_INNER,
    [
      { text: "producer", color: C("fg") },
      { text: "task.done", color: emitFlash ? C("green-bold") : C("green") },
    ],
    emitFlash ? C("green-bold") : C("dim"),
    SCALE,
  );

  // --- EventBus ラベル + メイン水平線（producer -> junction）---
  drawText(buf, EVENTBUS_LABEL_X, EVENTBUS_LABEL_Y, EVENTBUS_LABEL, C("dim"), SCALE);
  hline(buf, PRODUCER_RIGHT, WEATHER_CENTER, BUS_COLS, "-", C("dim"), SCALE);
  if (traveling) {
    const pulseCol = NA > 1 ? Math.round((i / (NA - 1)) * (BUS_COLS - 1)) : 0;
    drawGlyph(buf, PRODUCER_RIGHT + pulseCol * CELL, WEATHER_CENTER, "●".codePointAt(0), C("yellow-bold"), SCALE);
  }

  // --- 縦串（分岐）+ 3本の腕 ---
  const connColor = reacting ? C("green-bold") : C("dim");
  const spineSteps = (CHIP_CENTER - AQUA_CENTER) / CELL; // 10
  vline(buf, JX, AQUA_CENTER, spineSteps + 1, "|", connColor, SCALE);
  drawGlyph(buf, JX, AQUA_CENTER, "+".codePointAt(0), connColor, SCALE);
  drawGlyph(buf, JX, WEATHER_CENTER, "+".codePointAt(0), connColor, SCALE);
  drawGlyph(buf, JX, CHIP_CENTER, "+".codePointAt(0), connColor, SCALE);
  for (const rowY of [AQUA_CENTER, WEATHER_CENTER, CHIP_CENTER]) {
    hline(buf, JX + CELL, rowY, ARM_COLS - 1, "-", connColor, SCALE);
    drawGlyph(buf, JX + CELL * ARM_COLS, rowY, ">".codePointAt(0), connColor, SCALE);
  }

  // --- aquarium (cyan) ---
  const fishCount = reacting ? 3 : 2;
  const fishSegments = [];
  for (let n = 0; n < fishCount; n++) {
    fishSegments.push({
      text: n === 0 ? " ><>" : " ><>",
      color: reacting && n === fishCount - 1 ? C("cyan-bold") : C("cyan"),
    });
  }
  drawBox(
    buf,
    CONSUMER_X,
    AQUA_Y,
    CONSUMER_INNER,
    [
      { text: "aquarium", color: C("fg") },
      { segments: fishSegments },
    ],
    reacting ? C("cyan-bold") : C("dim"),
    SCALE,
  );

  // --- desk-weather (blue <-> yellow) ---
  drawBox(
    buf,
    CONSUMER_X,
    WEATHER_Y,
    CONSUMER_INNER,
    [
      { text: "weather", color: C("fg") },
      {
        segments: [
          { text: " cloud", color: reacting ? C("blue-dim") : C("blue-bold") },
          { text: "   sun", color: reacting ? C("yellow-bold") : C("yellow-dim") },
        ],
      },
    ],
    reacting ? C("yellow-bold") : C("dim"),
    SCALE,
  );

  // --- chiptune (magenta note) ---
  const noteChar = reacting ? "♪" : "-";
  const noteColor = reacting ? (i % 2 === 0 ? C("magenta-bold") : C("magenta")) : C("dim");
  drawBox(
    buf,
    CONSUMER_X,
    CHIP_Y,
    CONSUMER_INNER,
    [
      { text: "chiptune", color: C("fg") },
      {
        segments: [
          { text: " note: ", color: C("fg") },
          { text: noteChar, color: noteColor },
        ],
      },
    ],
    reacting ? C("magenta-bold") : C("dim"),
    SCALE,
  );

  // --- caption ---
  drawText(buf, centerX(CAPTION, SCALE), CAPTION_Y, CAPTION, C("dim"), SCALE);

  return { indices: buf, delayCs: DELAY_CS };
}

const frames = Array.from({ length: TOTAL }, (_, f) => buildFrame(f));
const gif = encodeGif(WIDTH, HEIGHT, palette, frames);
writeFileSync(outFile, gif);

const kb = Math.round(statSync(outFile).size / 1024);
console.log(`OK demo/how-it-works.gif  ${WIDTH}x${HEIGHT}  ${TOTAL}f @${FPS}fps  ${kb}KB`);
