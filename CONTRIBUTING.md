# CONTRIBUTING — 拡張のしかた（正本）

umeplay を「いつでも接続できる」状態に保つための規約。ガチガチにはしない。守るのは依存方向と配置だけ。

## 配置ルール

1. **新しい遊び = `apps/<name>/` に1つ**。core をまたぐ実装は書かない（再利用ロジックは core に落とす）
2. **再利用可能な部品 = `packages/core-<domain>/`**。app 固有ロジックを core に入れない
3. **app 間の共有は `contracts/events` 経由のみ**。app が別 app を import したら reject
4. **命名**: app はケバブケース名詞、core は `core-<領域>`、イベントは `<domain>.<verb>`

## 依存方向（絶対）

```
apps/*  →  packages/core-*  →  contracts/   （逆流・横流し禁止）
```

- core が app を import → 設計違反
- app が別 app を import → 設計違反
- core 同士の連携は `PlayEvent` 型経由（直接 import しない）

## 新しいイベントを足す

`contracts/events.ts` の `PlayEvent` union に1行足すだけ。producer/consumer 双方が自動で型を得る。

```ts
| { kind: "pomodoro.complete"; minutes: number }
```

## 新しいデバイスを足す（M5 / Ajazz など）

1. `packages/core-device/src/devices/<name>.ts` に `Device` 実装を書く
2. `packages/core-device/src/select.ts` の switch に `case "<name>":` を1行
3. app は無改修（HAL の `Device` インターフェースだけ見ているため）

Steam Deck は Linux PC 扱い＝デバイスドライバ不要。core-tui 系 app のビルドターゲット。

## テスト（品質は保つ・でもガチガチにしない）

| 層 | テスト |
|---|---|
| `contracts` | 型がコンパイルを通る（`npm run typecheck`） |
| `packages/core-*` | vitest unit を**真面目に**（純ロジックのみ） |
| `apps/*` | smoke（起動して落ちない）程度 |
| 実機 / 音 / シリアル | mock で代替。自動化しない |

- カバレッジ閾値は設けない。「重要ロジックにテストがある」で十分
- CI は `npm run check`（tsc + vitest）だけ。緑を保てる軽さに

## Codex に部品を作らせる

package 境界 = Codex の `allowed_paths` 境界。1 core = 1 タスクで切れる。
- `contracts/events` と対象 core の spec + test を**先に**固めてから委譲
- codex_task_runbook 準拠（`~/.claude/rules/codex_task_runbook.md`）
- 起票は CC、実行は人間（`call_codex.sh`）
