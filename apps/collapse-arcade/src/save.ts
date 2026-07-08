import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

/**
 * save.ts — ベストスコアの永続化（RPGセーブ風）。
 * `~/.toygarden/save.json` に `{ "<app名>": { "best": number } }` の形で置く。
 * 他アプリが同じファイルに相乗りしても名前空間で衝突しない設計。
 */

export const DEFAULT_SAVE_PATH = join(homedir(), ".toygarden", "save.json");
const KEY = "collapse-arcade";

interface SaveFile {
  [app: string]: { best?: number } | undefined;
}

function readSave(path: string): SaveFile {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // 壊れた save.json は無視して新規扱い
    return {};
  }
}

/** 保存済みのベストスコアを読む。ファイルが無い/壊れてたら 0。 */
export function loadBest(path: string = DEFAULT_SAVE_PATH): number {
  const best = readSave(path)[KEY]?.best;
  return typeof best === "number" && Number.isFinite(best) ? best : 0;
}

/**
 * score が既存ベストを上回っていれば保存する。戻り値は「更新できたか」。
 * ディレクトリ作成・書込に失敗しても投げない（fail-soft・ゲームの続行を優先する）。
 */
export function saveBest(score: number, path: string = DEFAULT_SAVE_PATH): boolean {
  if (score <= loadBest(path)) return false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    const data = readSave(path);
    data[KEY] = { best: score };
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}
