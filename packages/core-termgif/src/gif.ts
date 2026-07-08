/**
 * gif.ts — 依存ゼロの GIF89a エンコーダ（アニメーション対応）。
 *
 * 対応: グローバルカラーテーブル / NETSCAPE ループ / フレーム毎 delay / LZW 圧縮。
 * 参照: GIF89a specification (CompuServe, 1990)。
 */

/** RGB パレット（最大 256 色）。index 0 が背景色。 */
export type Palette = ReadonlyArray<readonly [number, number, number]>;

export interface GifFrame {
  /** パレット index の羅列（width*height） */
  indices: Uint8Array;
  /** 表示時間 (1/100 秒単位) */
  delayCs: number;
}

/** LZW 圧縮（GIF 方式・可変コード長・LSB first） */
export function lzwEncode(minCodeSize: number, indices: Uint8Array): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  const out: number[] = [];
  let bitBuf = 0;
  let bitCnt = 0;
  let codeSize = minCodeSize + 1;

  const emit = (code: number): void => {
    bitBuf |= code << bitCnt;
    bitCnt += codeSize;
    while (bitCnt >= 8) {
      out.push(bitBuf & 0xff);
      bitBuf >>>= 8;
      bitCnt -= 8;
    }
  };

  // 辞書: key = prefixCode * 256 + nextIndex（index < 256 なので衝突しない）
  let dict = new Map<number, number>();
  let nextCode = eoiCode + 1;

  const reset = (): void => {
    dict = new Map();
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  };

  emit(clearCode);
  reset();

  let cur = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = cur * 256 + k;
    const found = dict.get(key);
    if (found !== undefined) {
      cur = found;
      continue;
    }
    emit(cur);
    dict.set(key, nextCode);
    // 今割り当てたコードが現コード長の上限に達したら次から1bit広げる
    if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
    nextCode++;
    if (nextCode >= 4096) {
      emit(clearCode);
      reset();
    }
    cur = k;
  }
  emit(cur);
  emit(eoiCode);
  if (bitCnt > 0) out.push(bitBuf & 0xff);
  return Uint8Array.from(out);
}

/** 255 バイト毎のサブブロックに分割（終端 0x00 付き） */
function subBlocks(data: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.subarray(i, Math.min(i + 255, data.length));
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
  return out;
}

/** アニメーション GIF を組み立てる */
export function encodeGif(
  width: number,
  height: number,
  palette: Palette,
  frames: ReadonlyArray<GifFrame>,
): Uint8Array {
  if (frames.length === 0) throw new Error("encodeGif: frames が空");
  // パレットサイズは 2^n (n=1..8) に切り上げ
  let depth = 1;
  while (1 << depth < palette.length) depth++;
  if (depth > 8) throw new Error(`encodeGif: パレット ${palette.length} 色は上限 256 を超過`);
  const tableSize = 1 << depth;

  const out: number[] = [];
  const u16 = (v: number): void => {
    out.push(v & 0xff, (v >> 8) & 0xff);
  };

  // Header + Logical Screen Descriptor
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"
  u16(width);
  u16(height);
  out.push(0x80 | (depth - 1), 0, 0); // global color table flag + size
  for (let i = 0; i < tableSize; i++) {
    const [r, g, b] = palette[i] ?? [0, 0, 0];
    out.push(r, g, b);
  }

  // NETSCAPE2.0 application extension（無限ループ）
  out.push(0x21, 0xff, 11, ...[...`NETSCAPE2.0`].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, depth);
  for (const f of frames) {
    if (f.indices.length !== width * height) {
      throw new Error(`encodeGif: frame indices ${f.indices.length} != ${width * height}`);
    }
    // Graphic Control Extension
    out.push(0x21, 0xf9, 4, 0x04, 0, 0, 0, 0);
    out[out.length - 4] = f.delayCs & 0xff;
    out[out.length - 3] = (f.delayCs >> 8) & 0xff;
    // Image Descriptor（全面・ローカルテーブルなし）
    out.push(0x2c);
    u16(0);
    u16(0);
    u16(width);
    u16(height);
    out.push(0);
    // LZW data
    out.push(minCodeSize, ...subBlocks(lzwEncode(minCodeSize, f.indices)));
  }

  out.push(0x3b); // Trailer
  return Uint8Array.from(out);
}
