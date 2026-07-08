import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadBest, saveBest } from "../src/save.js";

// 実 HOME を汚さないよう、毎回テスト用の一時ディレクトリ配下に save.json を作る。
let savePath: string;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "toygarden-save-test-"));
  // 未作成の nested ディレクトリを指す → mkdirSync(recursive) の経路も一緒に検証する。
  savePath = join(dir, "nested", "save.json");
});

describe("save/load best score", () => {
  it("loadBest returns 0 when the save file does not exist", () => {
    expect(loadBest(savePath)).toBe(0);
  });

  it("saveBest persists a new best and loadBest reads it back", () => {
    const updated = saveBest(400, savePath);
    expect(updated).toBe(true);
    expect(loadBest(savePath)).toBe(400);
  });

  it("saveBest does not overwrite when score is not a new best", () => {
    saveBest(400, savePath);
    const updated = saveBest(300, savePath);
    expect(updated).toBe(false);
    expect(loadBest(savePath)).toBe(400);
  });

  it("saveBest rejects ties and accepts a strictly higher score", () => {
    saveBest(200, savePath);
    expect(saveBest(200, savePath)).toBe(false);
    expect(saveBest(500, savePath)).toBe(true);
    expect(loadBest(savePath)).toBe(500);
  });

  it("loadBest returns 0 for a corrupted save file instead of throwing", () => {
    saveBest(100, savePath);
    writeFileSync(savePath, "{ not valid json");
    expect(loadBest(savePath)).toBe(0);
  });

  it("saveBest preserves other apps' keys sharing the same save file", () => {
    mkdirSync(dirname(savePath), { recursive: true });
    writeFileSync(savePath, JSON.stringify({ "other-toy": { best: 42 } }));

    saveBest(150, savePath);

    const raw = JSON.parse(readFileSync(savePath, "utf8"));
    expect(raw["other-toy"]).toEqual({ best: 42 });
    expect(raw["collapse-arcade"]).toEqual({ best: 150 });
  });
});
