import { describe, it, expect } from "vitest";
import {
  parseRoutingLedger,
  parseCollapseStats,
  routingToEvents,
  collapseToEvents,
} from "@toygarden/core-worker-data";

const routing = [
  "# routing trial ledger",
  "taxonomy\tworker\tconfidence",
  "read_only_scan\tqwen\t0.8",
  "impl_1_3_files\tcodex\t0.6",
  "",
  "// trailing comment",
].join("\n");

const collapse = ["agent\trate", "codex\t0.19", "cc\t0.02"].join("\n");

describe("parseRoutingLedger", () => {
  it("skips comments/blank/header and parses rows", () => {
    const trials = parseRoutingLedger(routing);
    expect(trials).toHaveLength(2);
    expect(trials[0]).toEqual({
      taxonomy: "read_only_scan",
      predictedWorker: "qwen",
      confidence: 0.8,
    });
  });

  it("routingToEvents maps to worker.route", () => {
    const ev = routingToEvents(parseRoutingLedger(routing));
    expect(ev[0]).toMatchObject({ kind: "worker.route", worker: "qwen", confidence: 0.8 });
  });
});

describe("parseCollapseStats", () => {
  it("parses agent rates", () => {
    const stats = parseCollapseStats(collapse);
    expect(stats).toEqual([
      { agent: "codex", rate: 0.19 },
      { agent: "cc", rate: 0.02 },
    ]);
  });

  it("collapseToEvents maps to agent.collapse", () => {
    const ev = collapseToEvents(parseCollapseStats(collapse));
    expect(ev[0]).toMatchObject({ kind: "agent.collapse", agent: "codex", rate: 0.19 });
  });
});
