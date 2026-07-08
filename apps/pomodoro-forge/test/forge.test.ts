import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { MOTIFS } from "@toygarden/core-chiptune";
import {
  initForge,
  tick,
  applyEvent,
  completionMotif,
  draw,
  FOCUS_MS,
} from "../src/index.js";

describe("pomodoro-forge (合体 core の実証)", () => {
  it("ore grows with elapsed time", () => {
    const s = tick(initForge(), FOCUS_MS / 2);
    expect(s.ore).toBe(5);
    expect(s.done).toBe(false);
  });

  it("reaching FOCUS_MS marks done and yields completion motif", () => {
    const s = tick(initForge(), FOCUS_MS);
    expect(s.done).toBe(true);
    expect(s.ore).toBe(10);
    expect(completionMotif(s)).toBe(MOTIFS.deploySuccess);
  });

  it("git.commit refines ore into ingots (core-git-observe → forge)", () => {
    let s = tick(initForge(), FOCUS_MS / 2); // ore 5
    s = applyEvent(s, { kind: "git.commit", added: 10, removed: 0, coauthoredByClaude: true });
    expect(s.ore).toBe(0);
    expect(s.ingots).toBe(5);
  });

  it("draws to device (core-device)", () => {
    const dev = new MockDevice();
    draw(dev, tick(initForge(), FOCUS_MS));
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.lastLed).toEqual({ r: 255, g: 180, b: 0 });
  });

  it("device draw obeys HAL contract (clear→…→flush, ASCII-only text, ≤30 commands)", () => {
    const dev = new MockDevice();
    let s = tick(initForge(), FOCUS_MS / 2);
    s = applyEvent(s, { kind: "git.commit", added: 10, removed: 0, coauthoredByClaude: true });
    s = tick(s, FOCUS_MS);
    draw(dev, s);
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.flushes.length).toBe(1);
    expect(dev.flushes[0]).toEqual(dev.drawn);
    expect(dev.drawn.length).toBeLessThanOrEqual(30);
    for (const cmd of dev.drawn) {
      if (cmd.op === "text") expect(/^[\x20-\x7e]*$/.test(cmd.text)).toBe(true);
    }
  });
});
