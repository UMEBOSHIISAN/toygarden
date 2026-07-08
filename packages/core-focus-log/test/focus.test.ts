import { describe, it, expect } from "vitest";
import { toFocusEvents, toPlayEvents, activityTally } from "@toygarden/core-focus-log";
import type { FocusRow } from "@toygarden/core-focus-log";

// 合成データ（実際の個人ログは使わない）
const rows: FocusRow[] = [
  { id: 3, timestamp: 1783198549977, activity: "考え事をしている", photo_path: "/p/3.jpg", photo_exists: 1 },
  { id: 2, timestamp: 1783198500000, activity: "考え事をしている", photo_path: null, photo_exists: 1 },
  { id: 1, timestamp: 1783198406869, activity: "何かをじっと見ている。", photo_path: "/p/1.jpg", photo_exists: 0 },
];

describe("core-focus-log", () => {
  it("maps rows to domain events (hasPhoto = path present AND not purged)", () => {
    const ev = toFocusEvents(rows);
    expect(ev[0]).toEqual({ id: 3, at: 1783198549977, activity: "考え事をしている", hasPhoto: true });
    expect(ev[1].hasPhoto).toBe(false); // photo_path null
    expect(ev[2].hasPhoto).toBe(false); // photo_exists 0 (purged)
  });

  it("toPlayEvents produces focus.activity events", () => {
    const pe = toPlayEvents(toFocusEvents(rows));
    expect(pe[0]).toEqual({ kind: "focus.activity", activity: "考え事をしている", at: 1783198549977 });
  });

  it("activityTally counts activities, most frequent first", () => {
    const tally = activityTally(toFocusEvents(rows));
    expect(tally[0]).toEqual({ activity: "考え事をしている", count: 2 });
    expect(tally).toHaveLength(2);
  });
});
