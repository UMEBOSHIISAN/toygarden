import { describe, it, expect } from "vitest";
import { initAquarium, step, feed, render } from "../src/index.js";

describe("ascii-aquarium", () => {
  it("starts with the requested number of fish", () => {
    expect(initAquarium(40, 3).fish).toHaveLength(3);
  });

  it("step swims fish to the right", () => {
    const a = initAquarium(10, 1);
    const x0 = a.fish[0].x;
    expect(step(a).fish[0].x).toBe((x0 + 1) % 10);
  });

  it("feeding (task.done) adds a fish", () => {
    const a = feed(initAquarium(10, 2), { kind: "task.done", project: "投稿" });
    expect(a.fish).toHaveLength(3);
  });

  it("non-feed events do nothing", () => {
    const a = initAquarium(10, 2);
    expect(feed(a, { kind: "deploy.success" }).fish).toHaveLength(2);
  });

  it("render frames the tank at the given width", () => {
    const s = render(initAquarium(10, 1));
    expect(s.startsWith("|")).toBe(true);
    expect(s.endsWith("|")).toBe(true);
    expect(s).toHaveLength(12); // width + 2 borders
  });
});
