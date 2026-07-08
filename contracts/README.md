# @toygarden/contracts

3層アーキテクチャの**葉**。依存ゼロ。`apps/* → packages/core-* → contracts/` の一方向依存の終端。

ここにあるのは型だけ。producer（イベントを出す側）は誰が聞くか知らず、consumer（受ける側）は誰が出したか
知らない。この疎結合を支える共通語彙が `PlayEvent` — toygarden の全 core / 全 app が読み書きする唯一の橋。

## PlayEvent 一覧

`contracts/events.ts` の `PlayEvent` union（実体を実読して転記）。

| kind | フィールド | 意味 |
|---|---|---|
| `agent.dispatch` | `from: Agent`, `to: Agent`, `task: string` | エージェント間のタスク委譲 |
| `agent.collapse` | `agent: Agent`, `rate: number` | 越権/崩壊率の観測 |
| `git.commit` | `added: number`, `removed: number`, `coauthoredByClaude: boolean` | git コミット1件 |
| `worker.route` | `taxonomy: string`, `worker: Agent`, `confidence: number` | worker 配車の判定 |
| `gate.pending` | `label: string` | human-gate 待ち |
| `deploy.success` | (なし) | デプロイ成功 |
| `task.done` | `project: string` | タスク完了 |
| `focus.activity` | `activity: string`, `at: number`（epoch ms） | focus-cam ログ由来の活動記録 |

```ts
export type Agent = "cc" | "codex" | "qwen" | "gemma" | "human";
export type PlayEventKind = PlayEvent["kind"];
```

## Producer / Consumer

```ts
/** イベントを出す側。誰が聞くかを知らない（疎結合）。 */
export interface Producer {
  subscribe(handler: (e: PlayEvent) => void): () => void;
}

/** イベントを受けて描画 / 発音する側。 */
export interface Consumer {
  handle(e: PlayEvent): void;
}
```

`@toygarden/core-events` の `EventBus` が `Producer` の標準実装。app はこれを1つ持ち、
各 core / consumer を `subscribe` させ、observer 系 core（`core-git-observe` など）が `emit` する。

## 新しいイベントの足し方

`PlayEvent` union に1行足すだけ。producer 側・consumer 側は自動で型を得る（switch の
`case` 漏れは `tsc` が検出する — exhaustiveness チェックが働く設計）。

```ts
export type PlayEvent =
  | { kind: "agent.dispatch"; from: Agent; to: Agent; task: string }
  // ...既存...
  | { kind: "pomodoro.complete"; minutes: number }; // ← 新規イベントはここに追加
```

手順:

1. `contracts/events.ts` の `PlayEvent` union に型を1行追加
2. producer 側（多くは `packages/core-*` の `toPlayEvents` 系関数）で emit するコードを書く
3. consumer 側（`apps/*`）で `switch (e.kind)` に `case` を足す
4. `npm run typecheck` — 既存の `switch` が exhaustiveness で漏れを検出したら追随して直す

新しい core / app を1つ足すだけで既存コードには触らないのが基本形。イベント型の追加だけは
契約の中心なのでレビューを厚めに。
