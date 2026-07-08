import { describe, it, expect } from "vitest";
import { applyCrt, quantizeShared, renderCrtFrames } from "../src/crt.ts";
import { renderGif, renderCrtGif } from "../src/index.ts";
import type { Palette } from "../src/gif.ts";

describe("applyCrt", () => {
  const palette: Palette = [
    [10, 10, 10], // 0 = bg (dark)
    [240, 240, 240], // 1 = bright
  ];

  it("走査線: 偶数行(生ピクセル行)は奇数行より暗くなる（グロー/ビネット無効）", () => {
    const width = 4;
    const height = 4;
    const indices = new Uint8Array(width * height).fill(1); // 全面明るい色
    const img = applyCrt(width, height, palette, indices, {
      scanlineDarken: 0.3,
      glowStrength: 0,
      vignetteStrength: 0,
    });
    const evenRowR = img.data[(0 * width + 1) * 3];
    const oddRowR = img.data[(1 * width + 1) * 3];
    expect(evenRowR).toBeLessThan(oddRowR);
    expect(evenRowR).toBeCloseTo(240 * 0.7, 0);
    expect(oddRowR).toBeCloseTo(240, 0);
  });

  it("グロー: 明るいピクセルに隣接する暗い(背景)ピクセルが明るくなる", () => {
    const width = 3;
    const height = 1;
    const indices = Uint8Array.from([0, 1, 0]); // 中央だけ明るい
    const img = applyCrt(width, height, palette, indices, {
      scanlineDarken: 0,
      glowStrength: 0.5,
      glowThreshold: 96,
      vignetteStrength: 0,
    });
    const leftR = img.data[0 * 3];
    expect(leftR).toBeGreaterThan(10); // 背景色(10)より明るくなっている
    expect(leftR).toBeLessThan(240); // ただし明るい色そのものにはならない
  });

  it("ビネット: 四隅は中心より暗くなる", () => {
    const width = 5;
    const height = 5;
    const indices = new Uint8Array(width * height).fill(1);
    const img = applyCrt(width, height, palette, indices, {
      scanlineDarken: 0,
      glowStrength: 0,
      vignetteStrength: 0.5,
    });
    const cornerR = img.data[(0 * width + 0) * 3];
    const centerR = img.data[(2 * width + 2) * 3];
    expect(cornerR).toBeLessThan(centerR);
  });

  it("strength=0 系オプションは元画像をそのまま返す(効果無効)", () => {
    const width = 2;
    const height = 2;
    const indices = Uint8Array.from([0, 1, 1, 0]);
    const img = applyCrt(width, height, palette, indices, {
      scanlineDarken: 0,
      glowStrength: 0,
      vignetteStrength: 0,
    });
    for (let p = 0; p < width * height; p++) {
      const [r, g, b] = palette[indices[p]];
      expect(img.data[p * 3]).toBe(r);
      expect(img.data[p * 3 + 1]).toBe(g);
      expect(img.data[p * 3 + 2]).toBe(b);
    }
  });
});

describe("quantizeShared", () => {
  it("色数が maxColors 以下ならそのまま(丸めのみ)で収まる", () => {
    const width = 2;
    const height = 2;
    const images = [
      { width, height, data: Float32Array.from([0, 0, 0, 255, 255, 255, 10, 20, 30, 200, 100, 50]) },
    ];
    const { palette, indexed } = quantizeShared(images, 256);
    expect(palette.length).toBeLessThanOrEqual(256);
    expect(indexed[0].length).toBe(width * height);
    // index が指す色が元の色と一致する（step=1 なら丸めのみ）
    expect(palette[indexed[0][0]]).toEqual([0, 0, 0]);
    expect(palette[indexed[0][1]]).toEqual([255, 255, 255]);
  });

  it("色数が maxColors を超える場合は量子化して上限以内に収める", () => {
    const width = 64;
    const height = 64;
    const n = width * height;
    const data = new Float32Array(n * 3);
    // 各ピクセルをほぼ全部違う色にして「爆発」させる
    for (let p = 0; p < n; p++) {
      data[p * 3] = (p * 7) % 256;
      data[p * 3 + 1] = (p * 13) % 256;
      data[p * 3 + 2] = (p * 29) % 256;
    }
    const { palette, indexed } = quantizeShared([{ width, height, data }], 64);
    expect(palette.length).toBeLessThanOrEqual(64);
    // index が palette の範囲内であること
    for (const idx of indexed[0]) {
      expect(idx).toBeLessThan(palette.length);
    }
  });

  it("複数フレームで1本の共有パレットになる（GIF は1画像=1グローバルパレット）", () => {
    const width = 1;
    const height = 1;
    const imgA = { width, height, data: Float32Array.from([0, 0, 0]) };
    const imgB = { width, height, data: Float32Array.from([255, 255, 255]) };
    const { palette, indexed } = quantizeShared([imgA, imgB], 256);
    expect(indexed.length).toBe(2);
    expect(palette[indexed[0][0]]).toEqual([0, 0, 0]);
    expect(palette[indexed[1][0]]).toEqual([255, 255, 255]);
  });
});

describe("renderCrtFrames", () => {
  it("決定論的: 同じ入力から同じ palette/indices が出る", () => {
    const palette: Palette = [
      [13, 17, 23],
      [255, 123, 114],
    ];
    const frames = [
      { indices: Uint8Array.from([0, 1, 1, 0]), delayCs: 20 },
      { indices: Uint8Array.from([1, 0, 0, 1]), delayCs: 20 },
    ];
    const a = renderCrtFrames(2, 2, palette, frames);
    const b = renderCrtFrames(2, 2, palette, frames);
    expect(a.palette).toEqual(b.palette);
    expect(a.frames.map((f) => [...f.indices])).toEqual(b.frames.map((f) => [...f.indices]));
    expect(a.frames.map((f) => f.delayCs)).toEqual([20, 20]);
  });

  it("出力パレットは常に GIF 上限 256 以内", () => {
    const palette: Palette = [
      [10, 10, 10],
      [250, 250, 250],
    ];
    const frames = [{ indices: new Uint8Array(400).map((_, i) => (i % 2)), delayCs: 10 }];
    const { palette: outPalette } = renderCrtFrames(20, 20, palette, frames);
    expect(outPalette.length).toBeLessThanOrEqual(256);
  });
});

describe("renderCrtGif (index.ts 経由)", () => {
  it("renderGif の出力に影響しない(既存 API 不変)", () => {
    const frames = ["ab", "cd"];
    const before = renderGif(frames, { fps: 4 });
    renderCrtGif(frames, { fps: 4 });
    const after = renderGif(frames, { fps: 4 });
    expect(after).toEqual(before);
  });

  it("決定論的な GIF バイト列を返す", () => {
    const frames = ["hello", "world"];
    const a = renderCrtGif(frames, { fps: 4 });
    const b = renderCrtGif(frames, { fps: 4 });
    expect(a).toEqual(b);
    expect([...a.subarray(0, 3)]).toEqual([0x47, 0x49, 0x46]); // "GIF"
  });
});
