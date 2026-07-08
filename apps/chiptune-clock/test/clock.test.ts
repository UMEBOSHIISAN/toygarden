import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { chimeFor, drawClock } from "../src/index.js";

describe("chiptune-clock", () => {
  it("chimes 12 times at 0/12 o'clock and 1 time at 1 o'clock", () => {
    expect(chimeFor(0).notes).toHaveLength(12);
    expect(chimeFor(12).notes).toHaveLength(12);
    expect(chimeFor(1).notes).toHaveLength(1);
  });

  it("device draw obeys HAL contract (clear→…→flush, ASCII-only text, ≤30 commands)", () => {
    const dev = new MockDevice();
    drawClock(dev, 8, 8, 8, true); // "88:88" 相当（7セグ最大 on の桁）で最悪ケースを確認
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.flushes.length).toBe(1);
    expect(dev.flushes[0]).toEqual(dev.drawn);
    expect(dev.drawn.length).toBeLessThanOrEqual(30);
    for (const cmd of dev.drawn) {
      if (cmd.op === "text") expect(/^[\x20-\x7e]*$/.test(cmd.text)).toBe(true);
    }
  });

  it("colonOn=false draws fewer commands than colonOn=true (colon dots omitted)", () => {
    const on = new MockDevice();
    drawClock(on, 13, 45, 30, true);
    const off = new MockDevice();
    drawClock(off, 13, 45, 30, false);
    expect(off.drawn.length).toBe(on.drawn.length - 2);
  });
});
