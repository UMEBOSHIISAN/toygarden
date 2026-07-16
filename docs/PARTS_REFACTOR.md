# パーツ設計リファクタリング — Part System v1

> 設計: CC (Claude Code) 2026-07-16 · 実装: CO (Codex) へ段階委譲
> 対象: `packages/core-*`（パーツ）と、その周辺ツール（workshop / new-toy / diagram / frontier）
> 動機: パーツを現在の 10 種から 60+ 種へ拡張する（→ `docs/PARTS_CATALOG.md`）。現行構造は 10 種では回るが 50 種追加でスケール破綻する。

## 1. 現状の問題（CONFIRMED・実コード根拠つき）

| # | 問題 | 根拠 |
|---|------|------|
| P1 | **パーツのメタデータが本人の外に散在** — tagline は `tools/workshop.mjs` の `TAGLINES` 定数、配線サンプルも workshop.mjs 内ハードコード、使用実績(`uses`)は `demo/gifs/manifest.json`（GIF 生成の副産物） | workshop.mjs L95-160 |
| P2 | **分類軸がない** — 10 種はフラット一覧で選べるが、60 種のカード一覧は選べない | workshop.mjs はカードを packages/ スキャン順で並べるだけ |
| P3 | **イベント語彙が単一 union** — 全パーツが `contracts/events.ts` の `PlayEvent` 1 union に kind を足す構造。60 パーツが各自 kind を足すと肥大・衝突する | contracts/events.ts（現在 9 kind） |
| P4 | **パーツ API 規約が暗黙** — 「index.ts は pure・副作用なし」はコメントの口伝。新規パーツ作者（人間/agent とも）が従う保証がない | workshop.mjs L139 コメント |
| P5 | **vitest alias / tsconfig paths がパーツごとに手動追記** — パーツ追加のたびに `vitest.config.ts` と `tsconfig.base.json` を編集 | vitest.config.ts |

## 2. リファクタリング方針（R1〜R6）

### R1: パーツ manifest — 自己記述への一本化

各 `packages/core-*/package.json` に `toygarden` フィールドを追加し、パーツのメタデータの **SSOT を本人に置く**。新ファイルは増やさない（zero-dep・既存ファイル編集で済む）。

```jsonc
{
  "name": "@toygarden/core-sysmon",
  // ...既存フィールドはそのまま...
  "toygarden": {
    "role": "source",                    // §R2 の 6 role のいずれか
    "tagline": "Feel the pulse of your machine (CPU / mem / load).",
    "taglineJa": "マシンの鼓動を感じる（CPU / メモリ / 負荷）。",
    "produces": ["sys.pulse"],           // 発行する PlayEvent kind（なければ []）
    "consumes": [],                      // 購読する PlayEvent kind（なければ []）
    "status": "shipped"                  // shipped | designed | seed
  }
}
```

- `status`: `shipped`=実装済み / `designed`=カタログに設計あり・未実装 / `seed`=アイデアのみ
- workshop.mjs の `TAGLINES` 定数・`usageCount` の `uses` 依存は段階的に廃止し、この manifest を読む

### R2: role 6 分類（パーツの品詞）

| role | 役割 | イベントとの関係 | 現行パーツの割当 |
|------|------|------------------|------------------|
| `source` | 世界を観測してイベントを生む | produce のみ | core-git-observe, core-focus-log, core-worker-data, core-sysmon |
| `transform` | イベント/データを加工して返す | consume → produce（または pure 関数） | （現行なし — 空白地帯。カタログで重点補充） |
| `view` | ターミナルに描く | consume のみ | core-tui |
| `voice` | 音を出す | consume のみ | core-chiptune |
| `body` | 物理デバイスを動かす | consume のみ | core-device |
| `fabric` | 配線・保存・記録の下回り | イベントを運ぶ/焼く/残す | core-events, core-save, core-termgif |

覚え方: **source が観て、transform が考えて、view/voice/body が表現し、fabric が支える。**

### R3: パーツレジストリ `tools/parts.mjs`

`packages/` をスキャンして manifest を集約する読み取り専用ツール。

```
npm run parts            # role 別にパーツ一覧（shipped/designed/seed を色分け）
npm run parts -- --json  # 機械可読 JSON（workshop / diagram / frontier が共用）
```

- **export する関数**: `loadParts(rootDir)` → `PartInfo[]`（他ツールから import 可能に）
- `PartInfo = { name, role, tagline, taglineJa, produces, consumes, status, dir }`
- manifest 欠落パーツは `role: "unknown"` で fail-soft に一覧へ出す（落とさない・見えなくしない）
- workshop.mjs / diagram.mjs / frontier.mjs は後続フェーズでこの `loadParts()` に乗り換える

### R4: イベント語彙のドメイン分割（Phase 2）

`contracts/events.ts` を domain 別ファイルへ分割し、index で union 合成する。

```
contracts/events/agent.ts   — agent.dispatch / agent.collapse / worker.route / gate.pending
contracts/events/git.ts     — git.commit
contracts/events/sys.ts     — sys.pulse / focus.activity
contracts/events/ops.ts     — deploy.success / task.done
contracts/events/index.ts   — export type PlayEvent = AgentEvent | GitEvent | ...
```

**語彙統制ルール（60 パーツ時代の憲法）:**
1. 新パーツはまず **既存 kind の consume** を検討する（新 kind 追加は最後の手段）
2. 新 kind を足すときは **1 パーツ = 1 family まで**（`fs.change` と `fs.rename` は同一 family で可）
3. kind 名は `domain.verb` 形式・domain は既存優先
4. payload には `at?: number`（epoch ms）を推奨（replay / rhythm 系 transform が時刻を使う）

### R5: パーツ API 規約の明文化（暗黙 → 明文）

全パーツ共通（既存 10 種は事実上準拠済み・新規 54 種はこれに従って実装する）:

1. **index.ts は pure** — import 時副作用ゼロ。effect の入口は `create*` / `start*` / `read*` 命名
2. **乱数は seeded** — `Math.random()` 直呼び禁止。seed 引数を受け、同 seed → 同結果
3. **I/O は injectable** — `exec` / `fetch` / `fs` / 時計は引数で注入可能にし、テストは全 mock（外部依存ゼロ core パターン）
4. **source は `toPlayEvents()` アダプタを持つ** — 生データ型 → `PlayEvent[]` 変換を必ず export
5. **依存方向は app → core → contracts の一方向** — core 同士の依存は fabric への依存のみ許可（例: view が core-events に依存は可。view が voice に依存は不可）
6. **テストは `packages/core-X/test/*.test.ts`** — vitest・実 I/O なしで green になること

### R6: パーツ追加の摩擦除去（Phase 2）

- `vitest.config.ts` / `tsconfig.base.json` の alias 手動追記を、`packages/` スキャンによる自動生成に置換
- `npm run new`（new-toy）に「パーツ側」scaffold を追加: `npm run new -- --part core-foo --role transform`

## 3. 実装フェーズ（CO への委譲単位）

| Phase | 内容 | 規模 | 状態 |
|-------|------|------|------|
| **1** | R1 manifest を既存 10 パーツへ追加 + R3 `tools/parts.mjs` + `npm run parts` | package.json×10 + tool 1 + test 1 | **本日 CO へ dispatch** |
| 1b | workshop.mjs / diagram.mjs / frontier.mjs を `loadParts()` に乗り換え・`TAGLINES` 廃止 | 3 ファイル | Phase 1 完了後 |
| 2 | R4 contracts ドメイン分割 + R6 alias 自動生成 | contracts 一式 + config 2 | Phase 1b 後 |
| 3〜 | カタログ 54 種をバッチ実装（B1〜B9・6 種/バッチ、`docs/PARTS_CATALOG.md` §4） | 1 バッチ = 6 パーツ | 設計済み・順次 |

## 4. 非目標（このリファクタでやらないこと）

- 既存 22 toys の挙動変更（`npm run check` の green を壊す変更は全フェーズで禁止）
- 外部依存の追加（zero-dependency は維持。devDeps も typescript/vitest/esbuild のまま）
- npm publish 構成の変更（bin/prepack はスコープ外）
