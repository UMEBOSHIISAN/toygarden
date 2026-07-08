/**
 * bake_font.mjs — dhepper/font8x8 (Public Domain) の C ヘッダを src/font-data.ts に焼き込む。
 *
 * 使い方:
 *   node packages/core-termgif/tools/bake_font.mjs <font8x8_dir>
 *
 * 生成物はコミット済み（再実行は元データを更新したい時だけ）。
 * 元データ: https://github.com/dhepper/font8x8 (Author: Daniel Hepper, License: Public Domain,
 *           based on IBM public domain VGA fonts / Marcel Sondaar)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("usage: node bake_font.mjs <dir with font8x8_*.h>");
  process.exit(1);
}

/** C の `{ 0x00, ... }` 行を8バイト配列として全部拾う */
function parseGlyphs(file) {
  const text = readFileSync(join(srcDir, file), "utf8");
  const rows = [];
  const re = /\{\s*((?:0x[0-9A-Fa-f]{2}\s*,\s*){7}0x[0-9A-Fa-f]{2})\s*\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    rows.push(m[1].split(",").map((s) => parseInt(s.trim(), 16)));
  }
  return rows;
}

// テーブル → Unicode 開始点（font8x8 README 準拠）
const tables = [
  { file: "font8x8_basic.h", start: 0x0000, count: 128 },
  { file: "font8x8_ext_latin.h", start: 0x00a0, count: 96 },
  { file: "font8x8_greek.h", start: 0x0390, count: 58 },
  { file: "font8x8_box.h", start: 0x2500, count: 128 },
  { file: "font8x8_block.h", start: 0x2580, count: 32 },
  { file: "font8x8_hiragana.h", start: 0x3040, count: 96 },
];

const map = new Map();
for (const t of tables) {
  const glyphs = parseGlyphs(t.file);
  if (glyphs.length !== t.count) {
    console.error(`WARN ${t.file}: expected ${t.count} glyphs, got ${glyphs.length}`);
  }
  glyphs.forEach((g, i) => {
    const cp = t.start + i;
    if (g.some((b) => b !== 0) || cp === 0x20) map.set(cp, g);
  });
}

// 手描き追加グリフ（font8x8 に無い・toygarden の描画で使う記号）
// 各バイト=1行, bit0=左端ピクセル
const custom = {
  0x2261: [0x00, 0x7e, 0x00, 0x7e, 0x00, 0x7e, 0x00, 0x00], // ≡ 鯨の胴
  0x266a: [0x30, 0x30, 0x38, 0x34, 0x32, 0x32, 0x1e, 0x0c], // ♪
  0x2605: [0x18, 0x18, 0x7e, 0x3c, 0x3c, 0x66, 0x42, 0x00], // ★
  0x2606: [0x18, 0x18, 0x66, 0x24, 0x24, 0x5a, 0x42, 0x00], // ☆
  0x25cf: [0x00, 0x3c, 0x7e, 0x7e, 0x7e, 0x7e, 0x3c, 0x00], // ●
  0x25cb: [0x00, 0x3c, 0x42, 0x42, 0x42, 0x42, 0x3c, 0x00], // ○
  0x25c6: [0x00, 0x18, 0x3c, 0x7e, 0x3c, 0x18, 0x00, 0x00], // ◆
  0x25b2: [0x00, 0x18, 0x18, 0x3c, 0x3c, 0x7e, 0x7e, 0x00], // ▲
  0x25bc: [0x00, 0x7e, 0x7e, 0x3c, 0x3c, 0x18, 0x18, 0x00], // ▼
  0x2192: [0x00, 0x18, 0x30, 0x7e, 0x30, 0x18, 0x00, 0x00], // →
  0x2190: [0x00, 0x18, 0x0c, 0x7e, 0x0c, 0x18, 0x00, 0x00], // ←
  0x2191: [0x18, 0x3c, 0x7e, 0x18, 0x18, 0x18, 0x18, 0x00], // ↑
  0x2193: [0x18, 0x18, 0x18, 0x18, 0x7e, 0x3c, 0x18, 0x00], // ↓
  0x2665: [0x00, 0x66, 0xff, 0xff, 0x7e, 0x3c, 0x18, 0x00], // ♥
  0x30fc: [0x00, 0x00, 0x00, 0x7e, 0x00, 0x00, 0x00, 0x00], // ー 長音（かな用）
  0x30fb: [0x00, 0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00], // ・ 中黒（顔文字用）
  0x25bd: [0x00, 0x7e, 0x42, 0x24, 0x24, 0x18, 0x18, 0x00], // ▽（顔文字用）
};
for (const [cp, g] of Object.entries(custom)) map.set(Number(cp), g);

// base64 で1文字=コードポイント+8バイトを直列化（コンパクト化）
const cps = [...map.keys()].sort((a, b) => a - b);
const buf = Buffer.alloc(cps.length * 12);
cps.forEach((cp, i) => {
  buf.writeUInt32LE(cp, i * 12);
  for (let r = 0; r < 8; r++) buf.writeUInt8(map.get(cp)[r], i * 12 + 4 + r);
});

const out = `/**
 * font-data.ts — 8x8 ビットマップフォント（自動生成・編集禁止）
 *
 * 生成: tools/bake_font.mjs
 * 元データ: dhepper/font8x8 (Public Domain, IBM public domain VGA fonts 由来)
 *           https://github.com/dhepper/font8x8
 * 追加: toygarden 手描きグリフ（≡ ♪ ★ ● 矢印ほか・Public Domain として提供）
 *
 * 形式: 12バイト/グリフ [u32le codepoint][8バイト 行ビットマップ(bit0=左端)] を base64 直列化。
 * 収録: ASCII / Latin-1 / ギリシャ / 罫線 / ブロック / ひらがな / 追加記号 = ${cps.length} グリフ。
 */
export const FONT_BLOB = "${buf.toString("base64")}";
export const GLYPH_COUNT = ${cps.length};
`;

const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "font-data.ts");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`baked ${cps.length} glyphs -> ${dest} (${out.length} bytes)`);

// 目視検証: 'A' 'う' '─' を ASCII アートで出す
for (const ch of ["A", "う", "─", "≡", "★"]) {
  const g = map.get(ch.codePointAt(0));
  console.log(`--- ${ch}`);
  if (!g) { console.log("(missing)"); continue; }
  for (let r = 0; r < 8; r++) {
    let line = "";
    for (let c = 0; c < 8; c++) line += g[r] & (1 << c) ? "█" : "·";
    console.log(line);
  }
}
