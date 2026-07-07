import { describe, it, expect } from "vitest";
import { MockDevice, selectDevice } from "@umeplay/core-device";

describe("core-device HAL (mock)", () => {
  it("selectDevice defaults to mock", () => {
    const d = selectDevice("mock");
    expect(d.id).toBe("mock");
  });

  it("adapts to panel size (M5とAjazzで解像度が違っても app は panelSize() を使う)", () => {
    const cardputer = new MockDevice({ width: 240, height: 135 });
    expect(cardputer.panelSize()).toEqual({ width: 240, height: 135 });
  });

  it("records draw commands and flush", () => {
    const d = new MockDevice();
    d.draw({ op: "clear" });
    d.draw({ op: "text", x: 0, y: 0, text: "hi" });
    d.flush();
    expect(d.drawn).toHaveLength(2);
    expect(d.flushes[0]).toHaveLength(2);
  });

  it("simulates button input and unsubscribe", () => {
    const d = new MockDevice();
    const seen: number[] = [];
    const off = d.onButton((b) => seen.push(b));
    d.pressButton(2);
    off();
    d.pressButton(3);
    expect(seen).toEqual([2]);
  });

  it("throws on unknown device", () => {
    expect(() => selectDevice("nope")).toThrow(/unknown UMEPLAY_DEVICE/);
  });
});
