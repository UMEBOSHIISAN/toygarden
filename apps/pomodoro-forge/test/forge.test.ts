import { describe, it, expect } from "vitest";
import { MockDevice } from "@umeplay/core-device";
import { MOTIFS } from "@umeplay/core-chiptune";
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
});
