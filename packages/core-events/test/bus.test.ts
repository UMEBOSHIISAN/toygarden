import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@umeplay/core-events";
import type { PlayEvent } from "@umeplay/contracts";

describe("EventBus", () => {
  it("delivers events to subscribers", () => {
    const bus = new EventBus();
    const seen: PlayEvent[] = [];
    bus.subscribe((e) => seen.push(e));
    bus.emit({ kind: "deploy.success" });
    expect(seen).toEqual([{ kind: "deploy.success" }]);
  });

  it("unsubscribe stops delivery", () => {
    const bus = new EventBus();
    const fn = vi.fn();
    const off = bus.subscribe(fn);
    off();
    bus.emit({ kind: "gate.pending", label: "human-gate" });
    expect(fn).not.toHaveBeenCalled();
    expect(bus.size).toBe(0);
  });

  it("fans out to multiple consumers (疎結合)", () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);
    bus.emit({ kind: "git.commit", added: 3, removed: 1, coauthoredByClaude: true });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
