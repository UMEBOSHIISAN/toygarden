import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { hasGlyph } from "@toygarden/core-termgif";
import {
  cellGrid,
  initMirror,
  applyDraw,
  applyLed,
  applyButton,
  releaseButton,
  mirror,
  labelFor,
  ledFor,
} from "../src/index.js";
import { renderGadget } from "../src/view.js";
import { demo } from "../src/demo.js";

describe("device-mirror", () => {
  it("maps panel pixels to a char grid (8x16 cells)", () => {
    expect(cellGrid({ width: 320, height: 240 })).toEqual({ cols: 40, rows: 15 });
    expect(cellGrid({ width: 240, height: 135 })).toEqual({ cols: 30, rows: 8 });
  });

  it("clear resets the grid to blank", () => {
    const s0 = initMirror({ width: 80, height: 32 });
    const s1 = applyDraw(s0, { op: "text", x: 0, y: 0, text: "hi" });
    const s2 = applyDraw(s1, { op: "clear" });
    expect(s2.grid.every((row) => row.trim() === "")).toBe(true);
    expect(s2.log.at(-1)).toBe("clear");
  });

  it("text places characters at the pixel->cell coordinate", () => {
    const s0 = initMirror({ width: 80, height: 32 }); // 10 cols x 2 rows
    const s1 = applyDraw(s0, { op: "text", x: 8, y: 0, text: "AB" });
    expect(s1.grid[0].slice(1, 3)).toBe("AB");
    expect(s1.log.at(-1)).toBe('text(8,0) "AB"');
  });

  it("rect fills the covered cells", () => {
    const s0 = initMirror({ width: 80, height: 32 }); // 10 cols x 2 rows
    const s1 = applyDraw(s0, { op: "rect", x: 0, y: 0, w: 24, h: 16 });
    expect(s1.grid[0].slice(0, 3)).toBe("###");
    expect(s1.grid[1].trim()).toBe(""); // 2段目(y=16..31)には掛からない
  });

  it("led records color and a log line, button records label and releases cleanly", () => {
    const s0 = initMirror({ width: 80, height: 32 });
    const s1 = applyLed(s0, { r: 1, g: 2, b: 3 });
    expect(s1.led).toEqual({ r: 1, g: 2, b: 3 });
    expect(s1.log.at(-1)).toBe("led(1,2,3)");

    const s2 = applyButton(s1, 0);
    expect(s2.lastButton).toBe(0);
    expect(s2.log.at(-1)).toBe("button A");

    const s3 = releaseButton(s2);
    expect(s3.lastButton).toBeNull();
    expect(s3.log.at(-1)).toBe("button A"); // release はログを汚さない
  });

  it("mirror() forwards to the underlying MockDevice while tracking mirror state", () => {
    const device = new MockDevice({ width: 80, height: 32 });
    const dev = mirror(device);

    dev.draw({ op: "text", x: 0, y: 0, text: "hi" });
    dev.led({ r: 9, g: 9, b: 9 });
    dev.flush();

    expect(device.drawn).toEqual([{ op: "text", x: 0, y: 0, text: "hi" }]);
    expect(device.lastLed).toEqual({ r: 9, g: 9, b: 9 });
    expect(device.flushes).toHaveLength(1);

    expect(dev.snapshot().grid[0].slice(0, 2)).toBe("hi");
    expect(dev.snapshot().led).toEqual({ r: 9, g: 9, b: 9 });
  });

  it("mirror() tracks button presses made directly on the wrapped device", () => {
    const device = new MockDevice({ width: 80, height: 32 });
    const dev = mirror(device);

    device.pressButton(2);
    expect(dev.snapshot().lastButton).toBe(2);

    dev.release();
    expect(dev.snapshot().lastButton).toBeNull();
  });

  it("labelFor/ledFor are deterministic per PlayEvent kind", () => {
    expect(labelFor({ kind: "deploy.success" })).toBe("DEPLOY OK");
    expect(labelFor({ kind: "task.done", project: "投稿" })).toBe("DONE 投稿");
    expect(ledFor({ kind: "deploy.success" })).toEqual({ r: 0, g: 220, b: 0 });
    expect(ledFor({ kind: "gate.pending", label: "review" })).toEqual({ r: 220, g: 180, b: 0 });
  });

  it("renderGadget draws the bezel, buttons and log lines", () => {
    const device = new MockDevice({ width: 80, height: 32 });
    const dev = mirror(device);
    dev.draw({ op: "text", x: 0, y: 0, text: "hi" });
    dev.flush();

    const out = renderGadget(dev.snapshot());
    expect(out).toContain("device-mirror");
    expect(out).toContain("[A]");
    expect(out).toContain("[B]");
    expect(out).toContain("[C]");
    expect(out).toContain("recent:");
  });

  it("demo() only uses characters the GIF font (font8x8, kanji未収録) can render", () => {
    // 過去の●化け事故（漢字がGIFフォント未収録で塗りつぶしブロックへ化ける）の再発防止ガード。
    // banner.mjs の assertGlyph と同種のチェックを demo フレーム全数に対して行う。
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
    const spec = demo();
    expect(spec.frames.length).toBeGreaterThan(0);
    for (const frame of spec.frames) {
      const text = stripAnsi(frame);
      for (const ch of text) {
        if (ch === "\n" || ch === " ") continue;
        const cp = ch.codePointAt(0)!;
        expect(hasGlyph(cp), `グリフ未定義の文字 "${ch}" (U+${cp.toString(16).padStart(4, "0")})`).toBe(true);
      }
    }
  });
});
