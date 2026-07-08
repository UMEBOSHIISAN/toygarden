import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { strike, rest, wireButtons, type Forge } from "../src/index.js";

describe("focus-forge buttons", () => {
  it("button A (pressButton(0)) swings the hammer: 3 ore -> 1 ingot, redraws", () => {
    const device = new MockDevice();
    let forge: Forge = { ore: 4, ingots: 0 };
    wireButtons(
      device,
      () => forge,
      (f) => {
        forge = f;
      },
    );
    device.pressButton(0);
    expect(forge).toEqual({ ore: 1, ingots: 1 });
    expect(device.flushes.length).toBe(1);
  });

  it("button A is a no-op below 3 ore (no redraw)", () => {
    const device = new MockDevice();
    let forge: Forge = { ore: 2, ingots: 0 };
    wireButtons(
      device,
      () => forge,
      (f) => {
        forge = f;
      },
    );
    device.pressButton(0);
    expect(forge).toEqual({ ore: 2, ingots: 0 });
    expect(device.flushes.length).toBe(0);
  });

  it("button B (pressButton(1)) rests: refines whole 3-ore batches, redraws", () => {
    const device = new MockDevice();
    let forge: Forge = { ore: 5, ingots: 1 };
    wireButtons(
      device,
      () => forge,
      (f) => {
        forge = f;
      },
    );
    device.pressButton(1);
    expect(forge).toEqual({ ore: 2, ingots: 2 });
    expect(device.flushes.length).toBe(1);
  });

  it("strike/rest are pure functions matching forgeFromFocus's 3-ore refine ratio", () => {
    expect(strike({ ore: 3, ingots: 0 })).toEqual({ ore: 0, ingots: 1 });
    expect(rest({ ore: 0, ingots: 5 })).toEqual({ ore: 0, ingots: 5 });
  });
});
