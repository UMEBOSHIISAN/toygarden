import { describe, it, expect } from "vitest";
import { lzwEncode, encodeGif } from "../src/gif.ts";

/** テスト用 LZW デコーダ（エンコーダと独立に仕様から実装 = roundtrip 検証） */
function lzwDecode(minCodeSize: number, data: Uint8Array, expectedLen: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict: number[][] = [];
  const resetDict = (): void => {
    dict = [];
    for (let i = 0; i < clearCode; i++) dict[i] = [i];
    dict[clearCode] = [];
    dict[eoiCode] = [];
    codeSize = minCodeSize + 1;
  };
  resetDict();

  const out: number[] = [];
  let bitPos = 0;
  const readCode = (): number => {
    let v = 0;
    for (let b = 0; b < codeSize; b++) {
      const byte = data[bitPos >> 3];
      if (byte === undefined) return eoiCode;
      v |= ((byte >> (bitPos & 7)) & 1) << b;
      bitPos++;
    }
    return v;
  };

  let prev: number[] | null = null;
  for (;;) {
    const code = readCode();
    if (code === eoiCode) break;
    if (code === clearCode) {
      resetDict();
      prev = null;
      continue;
    }
    let entry: number[];
    if (code < dict.length && dict[code] !== undefined) {
      entry = dict[code];
    } else if (prev) {
      entry = [...prev, prev[0]];
    } else {
      throw new Error(`bad code ${code}`);
    }
    out.push(...entry);
    if (prev) {
      dict.push([...prev, entry[0]]);
      // デコーダ側は「次に読むコードが収まらなくなる直前」で拡張
      if (dict.length === (1 << codeSize) - 1 + 1 && codeSize < 12) codeSize++;
    }
    prev = entry;
    if (out.length >= expectedLen) break;
  }
  return Uint8Array.from(out);
}

describe("lzwEncode", () => {
  it("roundtrip: ランダム index 列が復元できる", () => {
    const src = new Uint8Array(4000);
    let s = 42;
    for (let i = 0; i < src.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      src[i] = s % 28;
    }
    const enc = lzwEncode(6, src);
    const dec = lzwDecode(6, enc, src.length);
    expect(dec).toEqual(src);
  });

  it("roundtrip: 単色ベタ塗り（辞書が伸びるケース）", () => {
    const src = new Uint8Array(10000).fill(3);
    const dec = lzwDecode(6, lzwEncode(6, src), src.length);
    expect(dec).toEqual(src);
  });

  it("roundtrip: 辞書リセット（4096 超）を跨いでも壊れない", () => {
    const src = new Uint8Array(60000);
    let s = 7;
    for (let i = 0; i < src.length; i++) {
      s = (s * 48271) % 2147483647;
      src[i] = s % 60;
    }
    const dec = lzwDecode(6, lzwEncode(6, src), src.length);
    expect(dec).toEqual(src);
  });
});

describe("encodeGif", () => {
  const palette = [
    [0, 0, 0],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ] as const;

  it("GIF89a ヘッダ・トレーラ・寸法が正しい", () => {
    const f = { indices: new Uint8Array(4 * 3).fill(1), delayCs: 10 };
    const gif = encodeGif(4, 3, palette, [f]);
    expect([...gif.subarray(0, 6)]).toEqual([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(gif[6] | (gif[7] << 8)).toBe(4); // width
    expect(gif[8] | (gif[9] << 8)).toBe(3); // height
    expect(gif[gif.length - 1]).toBe(0x3b); // trailer
  });

  it("複数フレームで NETSCAPE ループ拡張を含む", () => {
    const mk = (v: number) => ({ indices: new Uint8Array(4).fill(v), delayCs: 20 });
    const gif = encodeGif(2, 2, palette, [mk(0), mk(1), mk(2)]);
    const ascii = String.fromCharCode(...gif.subarray(0, 60));
    expect(ascii).toContain("NETSCAPE2.0");
  });

  it("サイズ不一致の frame は例外", () => {
    expect(() => encodeGif(2, 2, palette, [{ indices: new Uint8Array(3), delayCs: 10 }])).toThrow();
  });
});
