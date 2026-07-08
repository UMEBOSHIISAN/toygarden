# @toygarden/core-tui

ターミナル UI の最小基盤: 縦レーン描画・バッジ・ANSI カラー。依存は `@toygarden/contracts` のみ、
実端末描画は持たない（文字列を生成するだけの純ロジック）。`secretary-today` の「優先順位レーン」
表現を土台に、他 app が流用できる形に切り出したもの。

## 提供 API

`src/index.ts` が export する全体。

| API | 種別 | シグネチャ |
|---|---|---|
| `renderLanes` | 関数 | `renderLanes(lanes: Lane[]): string`（純関数・縦レーンを文字列化） |
| `badge` | 関数 | `badge(count: number): string`（未処理件数バッジ。0は淡色・1以上は赤） |
| `Lane` | interface | `{ title: string; items: LaneItem[] }` |
| `LaneItem` | interface | `{ label: string; status: Status }` |
| `Status` | type | `"ok" \| "blocked" \| "idle"` |
| `RED` / `GREEN` / `YELLOW` / `DIM` / `RESET` | 定数 | ANSI SGR エスケープシーケンス |
| `color` | 関数 | `color(code: string, s: string): string`（文字列を ANSI コードで囲む） |

## 使用例

```ts
import { renderLanes, badge, color, GREEN, type Lane } from "@toygarden/core-tui";

const lanes: Lane[] = [
  { title: "投稿", items: [{ label: "朝の投稿", status: "ok" }] },
  { title: "発送", items: [{ label: "B2発送", status: "blocked" }] },
];

console.log(renderLanes(lanes));
console.log(`未処理: ${badge(3)}`);
console.log(color(GREEN, "✓ done"));
```

`status: "blocked"` の項目は赤い `●` で描画される — UME_SOUL の優先順位（止まっているものが
最優先で見える）をそのまま可視化する設計。

## 使っている app

`event-loom` / `focus-tally` / `git-replay` / `routing-radar` / `secretary-today` が
`@toygarden/core-tui` を直接 import する（`apps/*/src/*.ts` を grep して実測）。

## 設計原則

- **文字列生成のみ**: 実端末への書き込み（`process.stdout.write` 等）は持たない。app 側が
  `renderLanes` の戻り値をどう出力するかを決める。
- **状態→見た目の写像を閉じ込める**: `Status` → マーク・色の対応表は `render.ts` 内の1箇所に集約。
  新しい状態を足すときはここだけ触ればよい。
- **依存ゼロの ANSI**: 16色 SGR を自前定義。カラーライブラリに依存しない。
