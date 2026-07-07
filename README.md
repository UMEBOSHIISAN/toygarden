# umeplay 🎛️

UMEBOSHI の遊び枠プラットフォーム。個々の遊び（`apps/`）を、再利用可能な部品（`packages/core-*`）と
共通の接続規約（`contracts/`）で組み立てる **modular monorepo**。

> 名前は仮。あとで変えられる。設計の正本: `~/play_platform_design.md`

## 3層アーキテクチャ

```
apps/*          遊び（薄い・core を組み合わせるだけ）
   │ import only ↓
packages/core-* 部品（再利用単位）
   │ import only ↓
contracts/      型・スキーマ（依存ゼロの葉）
```

**一方向依存のみ**（app → core → contracts）。app 同士は依存しない。合体もの（pomodoro-forge 等）も
app 層で core を複数 import して作る。連携は `contracts/events` の `PlayEvent` 型経由の疎結合。

## 部品カタログ（packages/）

| package | 責務 | 状態 |
|---|---|---|
| `@umeplay/core-events` | イベントバス（producer↔consumer を疎結合につなぐ） | ✅ P0 |
| `@umeplay/core-device` | デバイス HAL（M5 / Ajazz AKP153 / mock）。Steam Deck は HAL外 | ✅ P0（mockのみ） |
| `core-git-observe` | git 活動量観測（numstat + Co-Authored-By） | ✅ P1 |
| `core-chiptune` | 8bit 音生成（矩形波PCM/WAV/モチーフ） | ✅ P1 |
| `core-tui` | ターミナルUI基盤（レーン/バッジ/ANSI） | ✅ P1 |
| `core-worker-data` | worker配車/collapse データ供給（read-only） | ✅ P1 |
| `core-focus-log` | focus-cam ログ(sqlite)を read-only 供給。node:sqlite・後付け部品 | ✅ |

## 遊び（apps/）— 全10本 ✅ P2/P3

| app | 使う core | 中身 |
|---|---|---|
| `agent-constellation` | device, events | エージェント星座・dispatch線・collapse赤星 |
| `secretary-today` | tui | 優先順位レーン・blocked赤・未処理バッジ |
| `git-replay` | git-observe, tui | コミットのタイムラプス・人間/AI色分け |
| `chiptune-themes` | chiptune, events | イベント種別ごとの音テーマ |
| `collapse-arcade` | worker-data | 崩壊率高いエージェントを敵に・撃墜=レビュー |
| `desk-weather` | device | dirty/fail/stale を天気で表示 |
| `pomodoro-forge` | chiptune, device | 合体もの: 集中で鉱石→commitで精錬 |
| `ume-tamagotchi` | device | うめこ育成・投稿で喜ぶ/滞りで弱る |
| `routing-slot` | worker-data | 配車スロット・jackpot演出 |
| `ascii-aquarium` | contracts | ASCII水槽・task.doneで魚が増える |

`demo/wiring.test.ts` = 1本のイベントを4アプリが疎結合で受ける実証。
`demo/showcase.test.ts` = 全アプリの実レンダリングを出力。

## 使い方

```sh
npm install       # 依存導入（typescript + vitest のみ）
npm run typecheck # tsc --noEmit（型で守る）
npm test          # vitest run（core を真面目に、app は smoke）
npm run check     # 両方
```

実機なしで全部動く（`core-device` の既定は mock ドライバ）。

## 新しい遊び / デバイスの足し方

`CONTRIBUTING.md` を参照。要点だけ:
- 新しい遊び → `apps/<name>/` を1つ。core をまたぐ実装は禁止（core に落とす）
- 新デバイス → `packages/core-device/src/devices/<name>.ts` + `select.ts` に1行
- 新イベント → `contracts/events.ts` の `PlayEvent` に型を1つ追加
