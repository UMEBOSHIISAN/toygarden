import { describe, it, expect } from "vitest";
import { buildLanes, render, blockedCount, PRIORITY } from "../src/index.js";

describe("secretary-today", () => {
  it("lanes follow UME_SOUL priority order", () => {
    const lanes = buildLanes({});
    expect(lanes.map((l) => l.title)).toEqual([...PRIORITY]);
  });

  it("counts blocked items across lanes", () => {
    const n = blockedCount({
      "投稿": [{ label: "承認待ち", status: "blocked" }],
      "発送": [
        { label: "未発送", status: "blocked" },
        { label: "済", status: "ok" },
      ],
    });
    expect(n).toBe(2);
  });

  it("render includes titles and labels", () => {
    const out = render({ "投稿": [{ label: "本日分", status: "ok" }] });
    expect(out).toContain("投稿");
    expect(out).toContain("本日分");
  });
});
