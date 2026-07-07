import { homedir } from "node:os";
import { join } from "node:path";
import type { FocusRow } from "./parse.js";

/**
 * focus-cam の sqlite を read-only で読む adapter（副作用境界）。
 * node 組込みの node:sqlite を使う（外部npm不要）。テスト対象外（実DB依存）。
 * node:sqlite は新しい組込みでバンドラが静的解決に失敗するため動的 import する。
 */

export const DEFAULT_FOCUS_DB = join(homedir(), ".focus-log", "events.sqlite");

export async function readFocusRows(
  dbPath: string = DEFAULT_FOCUS_DB,
  limit = 200,
): Promise<FocusRow[]> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const stmt = db.prepare(
      "SELECT id, timestamp, activity, photo_path, photo_exists " +
        "FROM focus_events ORDER BY timestamp DESC LIMIT ?",
    );
    return stmt.all(limit) as unknown as FocusRow[];
  } finally {
    db.close();
  }
}
