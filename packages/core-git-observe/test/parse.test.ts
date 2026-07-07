import { describe, it, expect } from "vitest";
import { parseGitLog, toPlayEvents } from "@umeplay/core-git-observe";

const SOH = String.fromCharCode(1);
const US = String.fromCharCode(31);
const STX = String.fromCharCode(2);

function commit(hash: string, author: string, body: string, numstat: string): string {
  return `${SOH}${hash}${US}${author}${US}${body}${STX}\n${numstat}`;
}

describe("parseGitLog", () => {
  it("sums added/removed and detects Co-Authored-By Claude", () => {
    const raw = commit(
      "abc",
      "umeboshi",
      "feat\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
      "3\t1\tsrc/a.ts\n2\t0\tsrc/b.ts",
    );
    const [c] = parseGitLog(raw);
    expect(c.hash).toBe("abc");
    expect(c.added).toBe(5);
    expect(c.removed).toBe(1);
    expect(c.coauthoredByClaude).toBe(true);
  });

  it("handles binary (-) rows and human-only commits", () => {
    const raw = commit("def", "umeboshi", "fix", "-\t-\timg.png\n4\t2\tx.ts");
    const [c] = parseGitLog(raw);
    expect(c.added).toBe(4);
    expect(c.removed).toBe(2);
    expect(c.coauthoredByClaude).toBe(false);
  });

  it("parses multiple commits", () => {
    const raw =
      commit("a", "u", "one", "1\t0\tx") + commit("b", "u", "two", "2\t2\ty");
    expect(parseGitLog(raw)).toHaveLength(2);
  });

  it("toPlayEvents maps to git.commit events", () => {
    const ev = toPlayEvents(parseGitLog(commit("a", "u", "b", "1\t0\tx")));
    expect(ev[0]).toMatchObject({ kind: "git.commit", added: 1, removed: 0 });
  });
});
