/**
 * logo.mjs — README ヘッダ用のロゴを assets/logo.svg (dark) / assets/logo-light.svg (light)
 * へコードから決定論的に焼く。
 *
 *   npm run logo
 *
 * tools/banner.mjs が焼く demo/banner.gif の「umeplay」ワードマーク（8x8 ピクセルフォント・
 * 文字ごとに色を変えるレインボー配色・色収差風のシアン/マゼンタ残像）と同じ字形・配色語彙を
 * SVG（rect タイル）で再現する。banner.mjs 本体は変更しない（フォント取得元の core-termgif を
 * 同じ手順でバンドルして読むだけ）。
 *
 * ワードマークの右には、banner.mjs の「うめこの鼓動ハート」と同じ 8x7 ピクセルハートを
 * ガジェットマークとして添える（新規モチーフを増やさず、既存の視覚言語に揃える）。
 *
 * 決定論: Date・Math.random は一切使わない。全ピクセル位置・配色は整数演算のみで求まるため、
 * 2回実行しても同一バイト列が焼ける（npm run logo を2回叩いて shasum で確認済み）。
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const assetsDir = join(root, "assets");
const tmpDir = join(root, "dist", "demos");
mkdirSync(assetsDir, { recursive: true });
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

const { glyph, hasGlyph } = await import(
  pathToFileURL(await bundle(join(root, "packages", "core-termgif", "src", "index.ts"), "core-termgif")).href
);

// --- グリッド定数 ---------------------------------------------------------
// UNIT=6 は banner.mjs の SCALE_LOGO と同じ値。これにより下のゴースト残像オフセット
// (-3px / +3px,+1px) は banner.mjs 506〜509行目の生ピクセル値をそのまま流用できる
// （字形の拡大率が同じなので、残像の見え方の比率も一致する）。
const UNIT = 6;
const MARGIN_UNITS = 2;
const LETTER_GAP_UNITS = 1; // banner はスペース文字の全角ぶん空けるが、ワードマークとして
// 読ませたいロゴでは字間を詰める（banner.mjs は変更しない・ここだけの意図的な差）。
const GAP_TO_HEART_UNITS = 4;

const LETTERS = "umeplay".split("");
// banner.mjs の LOGO_COLOR_NAMES（cyan/green/yellow/magenta/blue/cyan/green）と同じ並び。
const COLOR_ORDER = ["cyan", "green", "yellow", "magenta", "blue", "cyan", "green"];
const BASE = {
  cyan: [57, 197, 207],
  green: [63, 185, 80],
  yellow: [210, 153, 34],
  magenta: [188, 140, 242],
  blue: [88, 166, 255],
};

// banner.mjs の HEART_BITMAP と同一（うめこの鼓動ハートと同じモチーフを流用）。
const HEART_BITMAP = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];

for (const ch of LETTERS) {
  const cp = ch.codePointAt(0);
  if (!hasGlyph(cp)) {
    throw new Error(`logo.mjs: グリフ未定義の文字 "${ch}" (U+${cp.toString(16).padStart(4, "0")})`);
  }
}

function scaleColor(rgb, factor) {
  return rgb.map((v) => Math.min(255, Math.round(v * factor)));
}

function toHex(rgb) {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** グリフの8バイト(bit0=左端)を、行ごとの "01..." 文字列8本に変換する。 */
function glyphRows(ch) {
  const bytes = glyph(ch.codePointAt(0));
  const rows = [];
  for (let gy = 0; gy < 8; gy++) {
    const byte = bytes[gy];
    let row = "";
    for (let gx = 0; gx < 8; gx++) row += byte & (1 << gx) ? "1" : "0";
    rows.push(row);
  }
  return rows;
}

/** 8列ビットマップ行1本を、連続する "1" ランごとに1本の rect へ間引く。 */
function rowToRects(row, originX, y, color) {
  const rects = [];
  let x = 0;
  while (x < row.length) {
    if (row[x] === "1") {
      const start = x;
      while (x < row.length && row[x] === "1") x++;
      const runLen = x - start;
      rects.push(
        `<rect x="${originX + start * UNIT}" y="${y}" width="${runLen * UNIT}" height="${UNIT}" fill="${color}"/>`,
      );
    } else {
      x++;
    }
  }
  return rects;
}

function bitmapToRects(rows, originX, originY, color, dx = 0, dy = 0) {
  const rects = [];
  for (let r = 0; r < rows.length; r++) {
    rects.push(...rowToRects(rows[r], originX + dx, originY + r * UNIT + dy, color));
  }
  return rects;
}

// --- レイアウト（全letter/heart原点を先に確定させる。ゴーストと本体で同じ原点を使い回す） ---
const marginPx = MARGIN_UNITS * UNIT;
const textY = marginPx;
let cursor = marginPx;
const letterOrigins = [];
for (let i = 0; i < LETTERS.length; i++) {
  letterOrigins.push({ x: cursor, y: textY });
  cursor += 8 * UNIT;
  if (i < LETTERS.length - 1) cursor += LETTER_GAP_UNITS * UNIT;
}
cursor += GAP_TO_HEART_UNITS * UNIT;
const heartOrigin = { x: cursor, y: textY + 0.5 * UNIT }; // 8行の文字高に7行のハートを縦centering
cursor += 8 * UNIT;

const WIDTH = cursor + marginPx;
const HEIGHT = (8 + MARGIN_UNITS * 2) * UNIT;

// banner.mjs 508〜509行目の生オフセットをそのまま踏襲(UNIT=SCALE_LOGOが同値のため)。
const GHOST_CYAN = { dx: -3, dy: 0 };
const GHOST_MAGENTA = { dx: 3, dy: 1 };

function buildSvg(theme) {
  const mainColors = Object.fromEntries(
    Object.entries(BASE).map(([name, rgb]) => [name, toHex(scaleColor(rgb, theme.mainFactor))]),
  );
  const ghostColor = toHex(scaleColor(BASE.cyan, theme.ghostFactor));
  const ghostColorMagenta = toHex(scaleColor(BASE.magenta, theme.ghostFactor));
  const heartColor = toHex(scaleColor(BASE.magenta, theme.mainFactor));

  const ghostCyanRects = LETTERS.flatMap((ch, i) =>
    bitmapToRects(glyphRows(ch), letterOrigins[i].x, letterOrigins[i].y, ghostColor, GHOST_CYAN.dx, GHOST_CYAN.dy),
  );
  const ghostMagentaRects = LETTERS.flatMap((ch, i) =>
    bitmapToRects(
      glyphRows(ch),
      letterOrigins[i].x,
      letterOrigins[i].y,
      ghostColorMagenta,
      GHOST_MAGENTA.dx,
      GHOST_MAGENTA.dy,
    ),
  );
  const mainRects = LETTERS.flatMap((ch, i) =>
    bitmapToRects(glyphRows(ch), letterOrigins[i].x, letterOrigins[i].y, mainColors[COLOR_ORDER[i]]),
  );
  const heartRects = bitmapToRects(HEART_BITMAP, heartOrigin.x, heartOrigin.y, heartColor);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`,
    `  <title>umeplay</title>`,
    `  <!-- tools/logo.mjs が焼く決定論的ロゴ (${theme.name}) — banner.mjs のワードマーク字形/配色を再現 -->`,
    `  <g opacity="${theme.ghostOpacity}">`,
    ...ghostCyanRects.map((r) => `    ${r}`),
    `  </g>`,
    `  <g opacity="${theme.ghostOpacity}">`,
    ...ghostMagentaRects.map((r) => `    ${r}`),
    `  </g>`,
    `  <g>`,
    ...mainRects.map((r) => `    ${r}`),
    `  </g>`,
    `  <g>`,
    ...heartRects.map((r) => `    ${r}`),
    `  </g>`,
    `</svg>`,
    "",
  ].join("\n");
}

// dark: GitHub ダークテーマ背景で映えるよう banner.mjs と同じ "bold" (×1.3) 相当を使う。
const DARK = { name: "dark", mainFactor: 1.3, ghostFactor: 0.5, ghostOpacity: 0.55 };
// light: 白背景でも視認できるよう、同じ色相を暗め(×0.65)に締めて使う("ink" 相当・banner.mjs
// には存在しないバリアントだが同じ scaleColor 式で導出しているため配色語彙は共通)。
const LIGHT = { name: "light", mainFactor: 0.65, ghostFactor: 0.32, ghostOpacity: 0.4 };

writeFileSync(join(assetsDir, "logo.svg"), buildSvg(DARK));
writeFileSync(join(assetsDir, "logo-light.svg"), buildSvg(LIGHT));

console.log(`OK assets/logo.svg + assets/logo-light.svg  ${WIDTH}x${HEIGHT}`);
