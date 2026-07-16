import type { PlayEvent } from "@toygarden/contracts";
import { describe, expect, it } from "vitest";
import { createClock, dateSeed } from "../src/index.js";

function manualTimer() {
  let callback = (): void => {};
  let nextId = 0;
  const cleared: ReturnType<typeof setInterval>[] = [];

  return {
    timer: {
      setInterval(fn: () => void, _ms: number): ReturnType<typeof setInterval> {
        callback = fn;
        nextId += 1;
        return nextId as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval(id: ReturnType<typeof setInterval>): void {
        cleared.push(id);
      },
    },
    fire(): void {
      callback();
    },
    cleared,
  };
}

describe("core-clock", () => {
  it("creates local-date seeds with zero-padded month and day", () => {
    expect(dateSeed(new Date(2026, 6, 16))).toBe(20260716);
    expect(dateSeed(new Date(2026, 0, 5))).toBe(20260105);
  });

  it("starts on subscribe and emits ticks from the injected clock", () => {
    const manual = manualTimer();
    const received: PlayEvent[] = [];
    createClock({ now: () => 123, timer: manual.timer }).subscribe((event) => received.push(event));

    manual.fire();

    expect(received).toEqual([{ kind: "clock.tick", at: 123 }]);
  });

  it("emits a chime after the tick when the hour changes", () => {
    const manual = manualTimer();
    const firstAt = new Date(2026, 6, 16, 10, 59).getTime();
    const secondAt = new Date(2026, 6, 16, 11, 0).getTime();
    let at = firstAt;
    const received: PlayEvent[] = [];
    createClock({ now: () => at, timer: manual.timer }).subscribe((event) => received.push(event));

    manual.fire();
    at = secondAt;
    manual.fire();

    expect(received).toEqual([
      { kind: "clock.tick", at: firstAt },
      { kind: "clock.tick", at: secondAt },
      { kind: "clock.chime", hour: 11, at: secondAt },
    ]);
  });

  it("does not chime on the first tick", () => {
    const manual = manualTimer();
    const at = new Date(2026, 6, 16, 11, 0).getTime();
    const received: PlayEvent[] = [];
    createClock({ now: () => at, timer: manual.timer }).subscribe((event) => received.push(event));

    manual.fire();

    expect(received).toEqual([{ kind: "clock.tick", at }]);
  });

  it("stops the timer on unsubscribe and stop", () => {
    const manual = manualTimer();
    const firstClock = createClock({ timer: manual.timer });
    const unsubscribe = firstClock.subscribe(() => {});
    const secondClock = createClock({ timer: manual.timer });
    secondClock.subscribe(() => {});

    unsubscribe();
    secondClock.stop();

    expect(manual.cleared).toEqual([
      1 as unknown as ReturnType<typeof setInterval>,
      2 as unknown as ReturnType<typeof setInterval>,
    ]);
  });
});
