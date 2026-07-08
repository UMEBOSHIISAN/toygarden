import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * save.ts — `~/.umeplay/<name>.json` への小さな永続セーブ。
 * 副作用境界（ファイル読込・書込）と純ロジック（パース・更新・パス解決）を分離する（設計 §1）。
 * 依存ゼロを守るため Immer 等は使わず structuredClone でディープコピーしてから更新する。
 */

export type SaveOptions = {
  /** テスト用注入。未指定時は ~/.umeplay/ */
  dir?: string;
};

export type SaveResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "EMPTY" | "CORRUPTED" }; // 読込失敗（ファイルが実在するが使えない場合）

/** 純ロジック（テスト対象）: JSON 文字列を安全にパースする。壊れていれば例外を投げず fallback を返す。 */
export function parseSave<T>(json: string, fallback: T): T {
  if (json.trim() === "") return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** 純ロジック（テスト対象）: 現在のデータに部分更新を適用する（ディープコピー→ミューテート→返却）。 */
export function applyUpdate<T>(current: T, updater: (draft: T) => void): T {
  const draft = structuredClone(current);
  updater(draft);
  return draft;
}

/** 純ロジック（テスト対象）: name + options からセーブファイルの絶対パスを解決する。 */
export function resolveSavePath(name: string, options?: SaveOptions): string {
  const dir = options?.dir ?? join(homedir(), ".umeplay");
  return join(dir, `${name}.json`);
}

/**
 * 副作用境界: ファイル読込・JSONパース。
 * ファイルが存在しない = 初回起動。エラー扱いにせず fallback をそのまま返す（fail-soft）。
 * ファイルは実在するが空/壊れている場合のみ ok:false で理由を返す。
 */
export async function loadSave<T>(
  name: string,
  fallback: T,
  options?: SaveOptions,
): Promise<SaveResult<T>> {
  const path = resolveSavePath(name, options);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return { ok: true, data: fallback };
  }
  if (raw.trim() === "") return { ok: false, reason: "EMPTY" };
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, reason: "CORRUPTED" };
  }
}

/**
 * 副作用境界: ファイル書込。失敗しても例外を投げず void を返す（fail-soft）。
 * おもちゃ（Toys）がセーブ失敗でクラッシュしないことを最優先する。
 */
export async function saveSave<T>(name: string, data: T, options?: SaveOptions): Promise<void> {
  const path = resolveSavePath(name, options);
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(data, null, 2) + "\n");
  } catch (err) {
    // ディスクフル・権限エラー等は握り潰し、軽く warn するだけに留める
    console.warn(`[core-save] failed to save "${name}":`, err);
  }
}
