import { describe, it, expect } from "vitest";
import { MockDevice } from "@toygarden/core-device";
import { initState, applyEvent, draw } from "../src/index.js";

describe("agent-constellation", () => {
  it("initializes one star per agent", () => {
    expect(initState().stars).toHaveLength(5);
  });

  it("dispatch adds a constellation edge", () => {
    const s = applyEvent(initState(), {
      kind: "agent.dispatch",
      from: "cc",
      to: "codex",
      task: "impl",
    });
    expect(s.edges).toEqual([{ from: "cc", to: "codex" }]);
  });

  it("collapse over 0.1 marks the star collapsed", () => {
    const s = applyEvent(initState(), { kind: "agent.collapse", agent: "codex", rate: 0.19 });
    expect(s.stars.find((x) => x.agent === "codex")?.collapsed).toBe(true);
  });

  it("draws to the device (clear + stars) and reds a collapsed star", () => {
    const dev = new MockDevice();
    let st = initState();
    st = applyEvent(st, { kind: "agent.collapse", agent: "qwen", rate: 0.5 });
    draw(dev, st);
    expect(dev.drawn[0]).toEqual({ op: "clear" });
    expect(dev.drawn.some((c) => c.op === "text")).toBe(true);
    expect(dev.lastLed).toEqual({ r: 255, g: 0, b: 0 });
  });
});
