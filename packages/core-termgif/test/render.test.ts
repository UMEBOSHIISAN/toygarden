import { describe, it, expect } from "vitest";
import { parseFrame, renderGif, seeded, glyph, hasGlyph } from "../src/index.ts";

describe("parseFrame", () => {
  it("SGR 色とテキストをセルに落とす", () => {
    const g = parseFrame("a\x1b[31mb\x1b[0mc");
    expect(g.rows).toBe(1);
    expect(g.cols).toBe(3);
    expect(g.cells[0][0]).toMatchObject({ cp: 97, fg: -1 });
    expect(g.cells[0][1]).toMatchObject({ cp: 98, fg: 1 });
    expect(g.cells[0][2]).toMatchObject({ cp: 99, fg: -1 });
  });

  it("dim / bold / bright を解釈する", () => {
    const g = parseFrame("\x1b[2mx\x1b[22m\x1b[1my\x1b[0m\x1b[92mz\x1b[0m");
    expect(g.cells[0][0]).toMatchObject({ dim: true, bold: false });
    expect(g.cells[0][1]).toMatchObject({ bold: true, dim: false });
    expect(g.cells[0][2]).toMatchObject({ fg: 2, bold: true });
  });

  it("画面クリア等の非SGRシーケンスは無視する", () => {
    const g = parseFrame("\x1b[2J\x1b[H\x1b[?25lab");
    expect(g.cols).toBe(2);
    expect(g.cells[0][0]?.cp).toBe(97);
  });

  it("全角は2セル（右半分 null）", () => {
    const g = parseFrame("うa");
    expect(g.cols).toBe(3);
    expect(g.cells[0][0]?.wide).toBe(true);
    expect(g.cells[0][1]).toBeNull();
    expect(g.cells[0][2]?.cp).toBe(97);
  });

  it("cols/rows 指定で不足分は空白で埋める", () => {
    const g = parseFrame("ab", { cols: 4, rows: 2 });
    expect(g.cells[1][3]?.cp).toBe(0x20);
  });
});

describe("font", () => {
  it("ASCII / かな / 罫線 / 手描き記号を収録", () => {
    for (const ch of ["A", "z", "0", "う", "め", "─", "│", "█", "≡", "★", "♪"]) {
      expect(hasGlyph(ch.codePointAt(0) as number), ch).toBe(true);
    }
  });
  it("未収録はフォールバックブロック（例外にしない）", () => {
    expect(glyph(0x1f41f).length).toBe(8);
  });
});

describe("renderGif", () => {
  it("フレーム列から妥当な GIF を生成（決定論的）", () => {
    const rnd = seeded(1);
    const frames = [0, 1, 2].map((i) => `frame ${i} ${"~".repeat(1 + Math.floor(rnd() * 5))}`);
    const a = renderGif(frames, { fps: 4 });
    const b = renderGif(frames, { fps: 4 });
    expect(a).toEqual(b);
    expect([...a.subarray(0, 3)]).toEqual([0x47, 0x49, 0x46]);
    expect(a.length).toBeGreaterThan(100);
  });

  it("フレーム間でサイズが揺れても最大サイズに正規化される", () => {
    const gif = renderGif(["ab", "abcdef\nghi"], { pxScale: 1 });
    // cols=6, rows=2 → 48x16
    expect(gif[6] | (gif[7] << 8)).toBe(48);
    expect(gif[8] | (gif[9] << 8)).toBe(16);
  });

  it("seeded は同じ seed で同じ列", () => {
    const a = seeded(99);
    const b = seeded(99);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
