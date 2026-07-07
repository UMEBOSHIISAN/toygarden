import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@umeplay/core-events";
import { label, loom, tally, renderDashboard, demoStream } from "../src/index.js";
import type { PlayEvent } from "@umeplay/contracts";

describe("event-loom", () => {
  it("labels every event kind (exhaustive, no blanks)", () => {
    for (const e of demoStream()) {
      expect(label(e).length).toBeGreaterThan(0);
    }
  });

  it("loom pipes bus events to the sink", () => {
    const bus = new EventBus();
    const sink = vi.fn();
    loom(bus, sink);
    bus.emit({ kind: "deploy.success" });
    expect(sink).toHaveBeenCalledOnce();
  });

  it("tally accumulates counts per kind", () => {
    let counts = {};
    counts = tally(counts, { kind: "git.commit", added: 1, removed: 0, coauthoredByClaude: true });
    counts = tally(counts, { kind: "git.commit", added: 2, removed: 1, coauthoredByClaude: false });
    counts = tally(counts, { kind: "deploy.success" } as PlayEvent);
    expect(counts).toEqual({ "git.commit": 2, "deploy.success": 1 });
  });

  it("renderDashboard shows header, ticker and totals", () => {
    let counts = {};
    for (const e of demoStream()) counts = tally(counts, e);
    const out = renderDashboard(["  ✓ deploy"], counts);
    expect(out).toContain("mission control");
    expect(out).toContain("events: 14");
    expect(out).toContain("git.commit");
  });
});
