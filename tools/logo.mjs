/**
 * logo.mjs — README ヘッダ用のロゴを assets/logo.svg (dark) / assets/logo-light.svg (light)
 * へコードから決定論的に焼く。
 *
 *   npm run logo
 *
 * デザイン言語: MOTHER2 のタイトル画面。黒地に赤一色の太いワードマーク、余計な装飾なし。
 * 一色の中に「上の行ほど明るく・下の行ほど暗い」縦シェーディングを入れて金属的な厚みを出し、
 * 右下に硬い1段のドロップシャドウを落とす（8bit タイトルの実在感）。
 * レインボー配色・色収差ゴースト・ハートは意図的に持たない — 可愛さは banner.gif と
 * おもちゃ達の担当で、タイトルは黙って立っているのが仕事。
 *
 * 字形は core-termgif の 8x8 ピクセルフォント（バナー/デモと同じ視覚言語の源泉）。
 *
 * 決定論: Date・Math.random は一切使わない。全ピクセル位置・配色は整数演算のみで求まるため、
 * 2回実行しても同一バイト列が焼ける。
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
const UNIT = 7; // 旧6→7。タイトルは一回り太く立たせる
const MARGIN_UNITS = 2;
const LETTER_GAP_UNITS = 1;

const LETTERS = "TOYGARDEN".split(""); // MOTHER2 と同じく大文字で組む

for (const ch of LETTERS) {
  const cp = ch.codePointAt(0);
  if (!hasGlyph(cp)) {
    throw new Error(`logo.mjs: グリフ未定義の文字 "${ch}" (U+${cp.toString(16).padStart(4, "0")})`);
  }
}

// --- 配色: 赤一色 + 縦シェーディング ---------------------------------------
// MOTHER2 タイトルの赤。行(0=上,7=下)ごとに明→暗のバンドを敷いて金属の厚みを出す。
// テーマ差は「同じ赤をどこまで沈めるか」だけ（dark=GitHubダーク背景 / light=白背景）。
function rowShade(theme, gy) {
  // 上端 1.0 → 下端 0.62 の線形バンド(8段・整数演算で決定論)
  const t = 1000 - Math.round((gy * 380) / 7); // 1000..620 (‰)
  const [r, g, b] = theme.base;
  const f = (v) => Math.min(255, Math.round((v * t) / 1000));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
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

// --- レイアウト -------------------------------------------------------------
const marginPx = MARGIN_UNITS * UNIT;
const textY = marginPx;
let cursor = marginPx;
const letterOrigins = [];
for (let i = 0; i < LETTERS.length; i++) {
  letterOrigins.push({ x: cursor, y: textY });
  cursor += 8 * UNIT;
  if (i < LETTERS.length - 1) cursor += LETTER_GAP_UNITS * UNIT;
}

const SHADOW = { dx: 3, dy: 3 }; // 硬い1段の落ち影(px)。柔らかいぼかしは使わない
const WIDTH = cursor + marginPx + SHADOW.dx;
const HEIGHT = (8 + MARGIN_UNITS * 2) * UNIT + SHADOW.dy;

function buildSvg(theme) {
  const shadowColor = theme.shadow;

  // 影レイヤ(単色・行シェーディングなし)
  const shadowRects = LETTERS.flatMap((ch, i) => {
    const rows = glyphRows(ch);
    const out = [];
    for (let gy = 0; gy < 8; gy++) {
      out.push(
        ...rowToRects(rows[gy], letterOrigins[i].x + SHADOW.dx, letterOrigins[i].y + gy * UNIT + SHADOW.dy, shadowColor),
      );
    }
    return out;
  });

  // 本体レイヤ(行ごとの明→暗バンド)
  const mainRects = LETTERS.flatMap((ch, i) => {
    const rows = glyphRows(ch);
    const out = [];
    for (let gy = 0; gy < 8; gy++) {
      out.push(...rowToRects(rows[gy], letterOrigins[i].x, letterOrigins[i].y + gy * UNIT, rowShade(theme, gy)));
    }
    return out;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`,
    `  <title>toygarden</title>`,
    `  <!-- tools/logo.mjs が焼く決定論的ロゴ (${theme.name}) — MOTHER2風: 赤一色・縦シェーディング・硬い落ち影 -->`,
    `  <g>`,
    ...shadowRects.map((r) => `    ${r}`),
    `  </g>`,
    `  <g>`,
    ...mainRects.map((r) => `    ${r}`),
    `  </g>`,
    `</svg>`,
    "",
  ].join("\n");
}

// dark: GitHub ダーク背景。MOTHER2 の赤(明るめの緋)+ほぼ黒の影。
const DARK = { name: "dark", base: [224, 56, 40], shadow: "#1a0505" };
// light: 白背景。同じ赤を少し沈め、影は薄い赤茶で紙に落ちた印刷物のように。
const LIGHT = { name: "light", base: [190, 38, 26], shadow: "#e8c9c4" };

writeFileSync(join(assetsDir, "logo.svg"), buildSvg(DARK));
writeFileSync(join(assetsDir, "logo-light.svg"), buildSvg(LIGHT));

console.log(`OK assets/logo.svg + assets/logo-light.svg  ${WIDTH}x${HEIGHT}  (MOTHER2-red / caps / hard shadow)`);
