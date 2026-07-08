import type { PlayEvent } from "@toygarden/contracts";

/**
 * focus-cam ログ（~/.focus-log/events.sqlite の focus_events テーブル）を扱う純ロジック。
 * DB 読取は reader.ts（副作用）に隔離。ここは行→ドメイン→イベントの変換のみ・テスト可能。
 * 個人ログは repo に入れない（テストは合成データ）。
 */

/** DB の生行（focus_events）。 */
export interface FocusRow {
  id: number;
  timestamp: number; // epoch ms
  activity: string;
  photo_path: string | null;
  photo_exists: number; // 1 = ディスク上, 0 = purged
}

/** 扱いやすいドメイン形。 */
export interface FocusEvent {
  id: number;
  at: number; // epoch ms
  activity: string;
  hasPhoto: boolean;
}

export function toFocusEvents(rows: FocusRow[]): FocusEvent[] {
  return rows.map((r) => ({
    id: r.id,
    at: r.timestamp,
    activity: r.activity,
    hasPhoto: !!r.photo_path && r.photo_exists !== 0,
  }));
}

/** 接続規約の focus.activity イベントへ変換（設計 §4.6）。 */
export function toPlayEvents(events: FocusEvent[]): PlayEvent[] {
  return events.map((e) => ({ kind: "focus.activity" as const, activity: e.activity, at: e.at }));
}

/** 活動ごとの件数集計（何に時間を使っているか）。多い順。 */
export function activityTally(events: FocusEvent[]): { activity: string; count: number }[] {
  const m = new Map<string, number>();
  for (const e of events) m.set(e.activity, (m.get(e.activity) ?? 0) + 1);
  return [...m.entries()]
    .map(([activity, count]) => ({ activity, count }))
    .sort((a, b) => b.count - a.count);
}
