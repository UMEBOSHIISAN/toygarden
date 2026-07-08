/**
 * font.ts — 焼き込み済み 8x8 ビットマップフォントの検索。
 *
 * データの出自は font-data.ts のヘッダ参照（Public Domain）。
 * 未収録グリフは「塗りつぶしブロック」で代替する（絵文字などが欠けても絵は壊れない）。
 */
import { FONT_BLOB, GLYPH_COUNT } from "./font-data.ts";

let table: Map<number, Uint8Array> | null = null;

function load(): Map<number, Uint8Array> {
  if (table) return table;
  const buf = Uint8Array.from(atob(FONT_BLOB), (c) => c.charCodeAt(0));
  table = new Map();
  for (let i = 0; i < GLYPH_COUNT; i++) {
    const off = i * 12;
    const cp =
      buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | ((buf[off + 3] << 24) >>> 0);
    table.set(cp, buf.subarray(off + 4, off + 12));
  }
  return table;
}

/** 未収録文字の代替（角丸ブロック） */
const FALLBACK_BLOCK = Uint8Array.from([0x00, 0x3c, 0x7e, 0x7e, 0x7e, 0x7e, 0x3c, 0x00]);

/** グリフ取得。8 バイト（1バイト=1行, bit0=左端）。 */
export function glyph(cp: number): Uint8Array {
  const g = load().get(cp);
  if (g) return g;
  if (cp === 0x20 || cp === 0x3000) return Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0]);
  // カタカナはひらがなグリフで音写（font8x8 はひらがなのみ収録。テ→て で読める）
  if (cp >= 0x30a1 && cp <= 0x30f6) {
    const h = load().get(cp - 0x60);
    if (h) return h;
  }
  return FALLBACK_BLOCK;
}

/** 収録済みか（demo 作成時の文字選定に使える） */
export function hasGlyph(cp: number): boolean {
  return load().has(cp);
}
