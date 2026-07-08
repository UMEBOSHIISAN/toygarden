import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { initPet, applyEvent, face, wireButtons } from "../src/index.js";

describe("ume-tamagotchi", () => {
  it("posting (task.done 投稿) raises mood most", () => {
    const p = applyEvent(initPet(), { kind: "task.done", project: "投稿" });
    expect(p.mood).toBe(65);
  });

  it("pending gates drain energy", () => {
    let p = initPet();
    p = applyEvent(p, { kind: "gate.pending", label: "承認待ち" });
    p = applyEvent(p, { kind: "gate.pending", label: "承認待ち" });
    expect(p.energy).toBe(30);
  });

  it("face reflects low energy first", () => {
    expect(face({ name: "うめこ", mood: 90, energy: 10 })).toBe("(´;ω;`)");
    expect(face({ name: "うめこ", mood: 90, energy: 80 })).toBe("(*^▽^*)");
  });

  it("mood/energy stay clamped in 0..100", () => {
    let p = initPet();
    for (let i = 0; i < 20; i++) p = applyEvent(p, { kind: "deploy.success" });
    expect(p.mood).toBe(100);
    expect(p.energy).toBe(100);
  });

  it("button A (pressButton(0)) pats the pet: mood rises and redraws", () => {
    const device = new MockDevice();
    let pet = initPet();
    wireButtons(
      device,
      () => pet,
      (p) => {
        pet = p;
      },
    );
    device.pressButton(0);
    expect(pet.mood).toBe(58);
    expect(device.drawn.length).toBeGreaterThan(0);
    expect(device.flushes.length).toBe(1);
  });

  it("button B (pressButton(1)) feeds the pet: energy rises and redraws", () => {
    const device = new MockDevice();
    let pet = initPet();
    wireButtons(
      device,
      () => pet,
      (p) => {
        pet = p;
      },
    );
    device.pressButton(1);
    expect(pet.energy).toBe(58);
    expect(device.flushes.length).toBe(1);
  });
});
