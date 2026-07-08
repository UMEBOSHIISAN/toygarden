# @umeplay/core-events

producer と consumer を疎結合につなぐ**最小イベントバス**。依存は `@umeplay/contracts` のみ。

app はこれを1つ持ち、各 core / consumer を `subscribe` させ、observer 系 core（`core-git-observe` など）
が `emit` する。同じバスに複数の購読者を繋いでも、互いを一切知らない — それがこの部品の存在理由。

## 提供 API

`src/index.ts` が export する全体（実体は `src/bus.ts`）。

| API | 種別 | シグネチャ |
|---|---|---|
| `EventBus` | class（`Producer` 実装） | `new EventBus()` |
| `EventBus#subscribe` | メソッド | `subscribe(handler: (e: PlayEvent) => void): () => void` |
| `EventBus#emit` | メソッド | `emit(e: PlayEvent): void` |
| `EventBus#size` | getter | `get size(): number`（購読者数・デバッグ用） |

`subscribe` の戻り値を呼ぶと解除される（unsubscribe）。

## 使用例

```ts
import { EventBus } from "@umeplay/core-events";
import type { PlayEvent } from "@umeplay/contracts";

const bus = new EventBus();

// 互いを知らない2つの購読者を同じバスに繋ぐ
const off1 = bus.subscribe((e) => console.log("ticker:", e.kind));
const off2 = bus.subscribe((e) => console.log("counter:", e.kind));

bus.emit({ kind: "deploy.success" });
// → ticker: deploy.success
// → counter: deploy.success

off1(); // 1つ目だけ解除
```

## 使っている app

`chiptune-themes` / `collapse-siren` / `event-loom` が `@umeplay/core-events` を直接 import する
（`apps/*/src/*.ts` を grep して実測）。特に `event-loom` は「1本のバスに疎結合な2購読者を繋ぐ」ことを
そのまま実演する app で、この core の設計思想の実証になっている。

## 設計原則

- **疎結合**: `EventBus` は誰が emit したか・誰が subscribe しているかを互いに知らせない。producer/consumer
  は `PlayEvent` の型だけを共有言語として繋がる。
- **一方向依存**: このパッケージは `@umeplay/contracts` にのみ依存する。`apps/*` から import されるが、
  逆に app を import することはない。
- **最小実装**: ハンドラの集合を `Set` で持つだけ。エラーハンドリングや優先度制御などは意図的に持たない
  — 必要になった app 側で組む。
