# @toygarden/core-focus-log

focus-cam ログ（`~/.focus-log/events.sqlite` の `focus_events` テーブル）を **read-only で供給**する
後付け部品。依存は `@toygarden/contracts` のみ（外部 npm 不要 — node 組込みの `node:sqlite` を使う）。

DB 読取（`reader.ts`）と行→ドメイン→イベントの変換（`parse.ts`）を分離しており、後者は合成データで
テストできる。個人の focus ログ実体は repo に一切含まれない。

## 提供 API

`src/index.ts` が export する全体。

| API | 種別 | シグネチャ |
|---|---|---|
| `FocusRow` | interface | `{ id; timestamp; activity; photo_path; photo_exists }`（DB の生行） |
| `FocusEvent` | interface | `{ id; at; activity; hasPhoto }`（扱いやすいドメイン形） |
| `toFocusEvents` | 関数 | `toFocusEvents(rows: FocusRow[]): FocusEvent[]`（純関数） |
| `toPlayEvents` | 関数 | `toPlayEvents(events: FocusEvent[]): PlayEvent[]`（`focus.activity` イベントへ変換） |
| `activityTally` | 関数 | `activityTally(events: FocusEvent[]): { activity: string; count: number }[]`（多い順の集計） |
| `readFocusRows` | 関数 | `readFocusRows(dbPath?: string, limit?: number): Promise<FocusRow[]>`（read-only DB読取。副作用） |
| `DEFAULT_FOCUS_DB` | 定数 | `~/.focus-log/events.sqlite` への絶対パス |

## 使用例

```ts
import { readFocusRows, toFocusEvents, activityTally } from "@toygarden/core-focus-log";

const rows = await readFocusRows(); // 既定パス・直近200件
const events = toFocusEvents(rows);

console.log(activityTally(events));
// [{ activity: "coding", count: 42 }, { activity: "meeting", count: 8 }, ...]
```

`focus-tally` はこの `activityTally` の出力を `core-tui` の横棒グラフに直接流し込む
（focus-log × tui の掛け合わせ）。

## 使っている app

`focus-aquarium` / `focus-forge` / `focus-tally` が `@toygarden/core-focus-log` を直接 import する
（`apps/*/src/*.ts` を grep して実測）。

## 設計原則

- **read-only 徹底**: `node:sqlite` を `readOnly: true` で開く。書き込みは一切行わない。
- **個人データは repo に入れない**: テストは合成 `FocusRow[]` を使う。実DBへの依存はテスト対象外
  （`reader.ts` に隔離）。
- **後付け部品**: 他の core と違い、ローカルの実行環境（focus-cam アプリ）に依存する。
  存在しない環境では `readFocusRows` が例外を投げるので、app 側で存在チェックを推奨。
