import { describe, it, expect } from "vitest";
import { GREEN, RED } from "@umeplay/core-tui";
import { buildFrames, aiShare } from "../src/index.js";
import type { GitCommit } from "@umeplay/core-git-observe";

const commits: GitCommit[] = [
  { hash: "newest0", author: "u", added: 5, removed: 2, coauthoredByClaude: true },
  { hash: "oldest0", author: "u", added: 1, removed: 0, coauthoredByClaude: false },
];

describe("git-replay", () => {
  it("emits one frame per commit, oldest first", () => {
    const frames = buildFrames(commits);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toContain("oldest"); // reversed → oldest first
    expect(frames[1]).toContain("newest");
  });

  it("colors additions green and deletions red", () => {
    const frames = buildFrames(commits);
    expect(frames[1]).toContain(GREEN);
    expect(frames[1]).toContain(RED);
  });

  it("computes AI co-author share", () => {
    expect(aiShare(commits)).toBe(0.5);
    expect(aiShare([])).toBe(0);
  });
});
