# @umeplay/core-worker-data

worker 配車ログ（routing trial）と崩壊統計（collapse stats）を **read-only で供給**する部品。
TSV ファイルをパースして構造化データと `PlayEvent` の両方を返す。依存は `@umeplay/contracts` のみ。

研究・運用データ（worker_routing_ledger 等）を umeplay の遊びに繋ぐための「読むだけ」アダプタ。
mutation は一切行わない。

## 提供 API

`src/index.ts` が export する全体。

| API | 種別 | シグネチャ |
|---|---|---|
| `RoutingTrial` | interface | `{ taxonomy: string; predictedWorker: string; confidence: number }` |
| `CollapseStat` | interface | `{ agent: string; rate: number }` |
| `parseRoutingLedger` | 関数 | `parseRoutingLedger(raw: string): RoutingTrial[]`（純関数・TSV文字列をパース） |
| `parseCollapseStats` | 関数 | `parseCollapseStats(raw: string): CollapseStat[]`（純関数） |
| `routingToEvents` | 関数 | `routingToEvents(trials: RoutingTrial[]): PlayEvent[]`（`worker.route` イベントへ変換） |
| `collapseToEvents` | 関数 | `collapseToEvents(stats: CollapseStat[]): PlayEvent[]`（`agent.collapse` イベントへ変換） |
| `loadRoutingTrials` | 関数 | `loadRoutingTrials(path: string): RoutingTrial[]`（read-only ファイル読取。副作用） |
| `loadCollapseStats` | 関数 | `loadCollapseStats(path: string): CollapseStat[]`（read-only ファイル読取。副作用） |

TSV 形式は `#` / `//` で始まる行とヘッダ行・空行を無視する。列は `taxonomy \t worker \t confidence`
（routing）、`agent \t rate`（collapse）。

## 使用例

```ts
import { loadCollapseStats, collapseToEvents } from "@umeplay/core-worker-data";

const stats = loadCollapseStats("./collapse_stats.tsv");
// [{ agent: "codex", rate: 0.03 }, { agent: "qwen", rate: 0.08 }, ...]

const events = collapseToEvents(stats); // PlayEvent[]（EventBus.emit にそのまま渡せる）
```

`collapse-arcade` は `CollapseStat[]` を直接受け取り、崩壊率が閾値を超えるエージェントを
「敵」として湧かせる — 生データを遊びの状態に変換するのは app 側の責務。

## 使っている app

`collapse-arcade` / `collapse-siren` / `routing-radar` / `routing-slot` が
`@umeplay/core-worker-data` を直接 import する（`apps/*/src/*.ts` を grep して実測）。

## 設計原則

- **read-only 徹底**: このパッケージはファイルを読むだけで、一切書き込まない。ログ・台帳を壊すリスクをゼロにする。
- **純ロジックと副作用の分離**: `parseRoutingLedger` / `parseCollapseStats`（純関数）と
  `loadRoutingTrials` / `loadCollapseStats`（ファイル読取）を分離。テストは前者を直接叩く。
- **形式に寛容な TSV パーサ**: コメント行・ヘッダ行・空行を自動で無視するので、実運用ログを
  そのまま食わせられる。
