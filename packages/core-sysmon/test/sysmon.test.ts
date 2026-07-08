import { describe, it, expect, vi } from "vitest";
import { createSysmonCalculator, type SysmonContext } from "@toygarden/core-sysmon";

const ctx = (overrides: Partial<SysmonContext> = {}): SysmonContext => ({
  totalMem: 1000,
  freeMem: 1000,
  loadavg: [0],
  cpuTimes: { idle: 0, total: 0 },
  logicalCores: 4,
  ...overrides,
});

describe("createSysmonCalculator", () => {
  it("cpuRatio becomes 1.0 when idle time does not advance while total does", () => {
    const calc = createSysmonCalculator();
    calc(ctx({ cpuTimes: { idle: 1000, total: 5000 } })); // baseline
    const sample = calc(ctx({ cpuTimes: { idle: 1000, total: 6000 } }));
    expect(sample.cpuRatio).toBe(1);
  });

  it("cpuRatio stays 0 when idle and total advance at the same rate", () => {
    const calc = createSysmonCalculator();
    calc(ctx({ cpuTimes: { idle: 1000, total: 5000 } })); // baseline
    const sample = calc(ctx({ cpuTimes: { idle: 1500, total: 5500 } }));
    expect(sample.cpuRatio).toBe(0);
  });

  it("memRatio = 1 - freeMem / totalMem", () => {
    const calc = createSysmonCalculator();
    const sample = calc(ctx({ totalMem: 1000, freeMem: 250 }));
    expect(sample.memRatio).toBe(0.75);
  });

  it("loadRatio = loadavg[0] / logicalCores, clipped at 1", () => {
    const calc = createSysmonCalculator();
    const sample = calc(ctx({ loadavg: [10], logicalCores: 4 }));
    expect(sample.loadRatio).toBe(1);
  });

  it("busyness is the weighted average of cpuRatio(0.5) / memRatio(0.3) / loadRatio(0.2)", () => {
    const calc = createSysmonCalculator();
    calc(ctx({ cpuTimes: { idle: 1000, total: 5000 }, totalMem: 1000, freeMem: 1000, loadavg: [0] })); // baseline
    const sample = calc(
      ctx({ cpuTimes: { idle: 1000, total: 6000 }, totalMem: 1000, freeMem: 250, loadavg: [10], logicalCores: 4 }),
    );
    // cpuRatio: 1, memRatio: 0.75, loadRatio: 1 (clipped)
    expect(sample.cpuRatio).toBe(1);
    expect(sample.memRatio).toBe(0.75);
    expect(sample.loadRatio).toBe(1);
    expect(sample.busyness).toBeCloseTo(1 * 0.5 + 0.75 * 0.3 + 1 * 0.2, 10);
  });
});

describe("startSysmonFeed", () => {
  it("stops delivering samples once the returned stop function is called", async () => {
    vi.useFakeTimers();
    try {
      const { startSysmonFeed } = await import("@toygarden/core-sysmon");
      const callback = vi.fn();
      const stop = startSysmonFeed(callback, 100);

      await vi.advanceTimersByTimeAsync(350);
      const callsBeforeStop = callback.mock.calls.length;
      expect(callsBeforeStop).toBeGreaterThan(0);

      stop();
      await vi.advanceTimersByTimeAsync(500);
      expect(callback.mock.calls.length).toBe(callsBeforeStop);
    } finally {
      vi.useRealTimers();
    }
  });
});
