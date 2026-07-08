import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyUpdate, loadSave, parseSave, resolveSavePath, saveSave } from "@umeplay/core-save";

const tmpDirs: string[] = [];
async function makeTmpDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "core-save-test-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("parseSave", () => {
  it("parses a well-formed JSON string", () => {
    expect(parseSave<{ a: number }>('{"a":1}', { a: 0 })).toEqual({ a: 1 });
  });

  it("returns the fallback on malformed JSON instead of throwing", () => {
    expect(parseSave('{"a": 1', { a: 0 })).toEqual({ a: 0 });
  });
});

describe("applyUpdate", () => {
  it("applies a partial update and returns a new object (immer-like)", () => {
    const current = { count: 1 };
    const next = applyUpdate(current, (d) => {
      d.count++;
    });
    expect(next).toEqual({ count: 2 });
    expect(current).toEqual({ count: 1 }); // 元のオブジェクトは変更されない
    expect(next).not.toBe(current);
  });
});

describe("resolveSavePath", () => {
  it("resolves the path from the injected dir, OS-independent (pure path join)", () => {
    expect(resolveSavePath("my-toy", { dir: "/tmp/dummy-dir" })).toBe(join("/tmp/dummy-dir", "my-toy.json"));
  });
});

describe("loadSave", () => {
  it("returns the fallback when the file does not exist", async () => {
    const dir = await makeTmpDir();
    const result = await loadSave("nonexistent", { count: 0 }, { dir });
    expect(result).toEqual({ ok: true, data: { count: 0 } });
  });
});

describe("saveSave", () => {
  it("fails soft (does not throw, resolves) when the write target is unusable", async () => {
    const dir = await makeTmpDir();
    // "ディレクトリ"のはずの場所に実際にはファイルを置く → mkdir(recursive) が ENOTDIR で必ず失敗する
    // (chmod による権限テストより移植性が高い: root 実行の CI でも確実に失敗させられる)
    const fakeDir = join(dir, "not-a-directory");
    await writeFile(fakeDir, "i am a file, not a directory");

    await expect(saveSave("toy-state", { score: 1 }, { dir: fakeDir })).resolves.toBeUndefined();
  });
});
