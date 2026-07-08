import { describe, it, expect } from "vitest";
import { renderLanes, badge, RED, type Lane } from "@toygarden/core-tui";

const lanes: Lane[] = [
  {
    title: "投稿",
    items: [
      { label: "本日の投稿", status: "ok" },
      { label: "承認待ち", status: "blocked" },
    ],
  },
  { title: "発送", items: [{ label: "未発送", status: "idle" }] },
];

describe("renderLanes", () => {
  it("includes lane titles and item labels", () => {
    const out = renderLanes(lanes);
    expect(out).toContain("投稿");
    expect(out).toContain("発送");
    expect(out).toContain("本日の投稿");
    expect(out).toContain("承認待ち");
  });

  it("marks blocked items in red", () => {
    const out = renderLanes([
      { title: "x", items: [{ label: "stopped", status: "blocked" }] },
    ]);
    expect(out).toContain(RED);
  });
});

describe("badge", () => {
  it("red when count > 0", () => {
    expect(badge(3)).toContain("(3)");
    expect(badge(3)).toContain(RED);
  });
  it("dim (0) when empty", () => {
    expect(badge(0)).toContain("(0)");
  });
});
