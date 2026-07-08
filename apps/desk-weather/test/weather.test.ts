import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { weatherFor, draw } from "../src/index.js";

describe("desk-weather", () => {
  it("all-zero metrics = sunny", () => {
    expect(weatherFor({ dirtyFiles: 0, testFailures: 0, staleMemory: 0 })).toBe("sunny");
  });

  it("test failures are weighted heavier (weight 3)", () => {
    // 2 failures = score 6 → rain, 3 failures = score 9 → storm
    expect(weatherFor({ dirtyFiles: 0, testFailures: 2, staleMemory: 0 })).toBe("rain");
    expect(weatherFor({ dirtyFiles: 0, testFailures: 3, staleMemory: 0 })).toBe("storm");
    // 同じ score をdirtyだけで作るには9個要る（テスト失敗の方が早く荒れる）
    expect(weatherFor({ dirtyFiles: 6, testFailures: 0, staleMemory: 0 })).toBe("rain");
  });

  it("draws weather to device and reds the LED on storm", () => {
    const dev = new MockDevice();
    draw(dev, { dirtyFiles: 20, testFailures: 5, staleMemory: 3 });
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.lastLed).toEqual({ r: 255, g: 0, b: 0 });
  });
});
