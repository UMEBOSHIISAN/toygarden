# umeplay 🎛️

> **端末で遊びが生える組み立てキット** — A construction kit where terminal toys grow.

![umeplay aquarium](demo/gifs/ascii-aquarium.gif)

> `npm run play aquarium` — task.done イベントで魚が増える ASCII 水槽。夜になると月が出る。
> **このGIFはスクリーン録画ではない。** コードから決定論的に焼いている（後述）。

7つの部品（`packages/core-*`）を、1枚の契約（`contracts/`）でつなぐと、
水槽が泳ぎ、git 履歴が歌い、机に天気が降る。**アプリを作るんじゃない。部品を掛け合わせると遊びが生える。**

- **依存ゼロ** — ランタイム依存なし。TypeScript + Node だけ（devDeps は tsc / vitest / esbuild のみ）
- **全部ターミナル** — ビルドもブラウザも実機も不要。`npm run play <名前>` して3秒で動く
- **デモが腐らない** — README の GIF は `npm run gifs` がコードから再生成する

**In English:** umeplay is a zero-dependency TypeScript monorepo where 20 terminal toys
(aquarium, chiptune, tamagotchi, weather…) are assembled from 8 reusable cores connected by
a single event contract. Even the demo GIFs are rendered deterministically from code —
a built-in GIF89a encoder with an 8x8 public-domain bitmap font. `npm install && npm run play aquarium`.

## 使い方

```sh
npm install         # 依存導入（typescript + vitest + esbuild のみ）
npm run play        # 遊び一覧
npm run play aquarium   # 名前は部分一致。Ctrl+C で終了
npm run check       # typecheck + テスト
npm run gifs        # 全デモGIFをコードから再生成 → demo/gifs/
npm run showcase    # デモ画面 demo/index.html を再生成
```

実機なしで全部動く（`core-device` の既定は mock ドライバ）。

## 3層アーキテクチャ

```
apps/*          遊び（薄い・core を組み合わせるだけ）
   │ import only ↓
packages/core-* 部品（再利用単位）
   │ import only ↓
contracts/      型・スキーマ（依存ゼロの葉）
```

**一方向依存のみ**（app → core → contracts）。app 同士は依存しない。
連携は `contracts/events.ts` の `PlayEvent` 型経由の疎結合 —
producer は誰が聞くか知らない。consumer は誰が出したか知らない。

![event-loom mission control](demo/gifs/event-loom.gif)

> `npm run play event-loom` — 1本の EventBus に現実的なイベント列を流し、**疎結合な2つの購読者**（色付きティッカー＋種別カウンタ）が同時に反応する。この共通言語 `PlayEvent` がキットの芯。

## 部品カタログ（packages/）

| package | 責務 |
|---|---|
| [`core-events`](packages/core-events/) | イベントバス（producer↔consumer を疎結合につなぐ） |
| [`core-device`](packages/core-device/) | デバイス HAL（M5 / Ajazz AKP153 / mock） |
| [`core-git-observe`](packages/core-git-observe/) | git 活動量観測（numstat + Co-Authored-By） |
| [`core-chiptune`](packages/core-chiptune/) | 8bit 音生成（矩形波PCM/WAV/モチーフ） |
| [`core-tui`](packages/core-tui/) | ターミナルUI基盤（レーン/バッジ/ANSI） |
| [`core-worker-data`](packages/core-worker-data/) | worker配車/collapse データ供給（read-only） |
| [`core-focus-log`](packages/core-focus-log/) | focus-cam ログ(sqlite)を read-only 供給 |
| [`core-termgif`](packages/core-termgif/) | ANSI出力→GIF。デモを腐らせないための部品（GIF89a+LZW+8x8フォント内蔵） |

## 遊びカタログ（apps/ — 全20本・全部GIF付き）

**全GIFギャラリー → [demo/index.html](demo/index.html)**（`npm run showcase` で再生成）

| app | 部品の掛け合わせ | 一言 |
|---|---|---|
| [ascii-aquarium](demo/gifs/ascii-aquarium.gif) | contracts | task.done で魚が増える ASCII 水槽。夜になると月が出る |
| [event-loom](demo/gifs/event-loom.gif) | events × tui | 1本のバスに流れる全イベントを織って見せる万能ビューア |
| [commit-symphony](demo/gifs/commit-symphony.gif) | git-observe × chiptune | git 履歴が 8bit の曲になる。AI 共著は1オクターブ上で鳴く |
| [git-replay](demo/gifs/git-replay.gif) | git-observe × tui | リポジトリの歴史をタイムラプス再生。人間と AI を色分け |
| [secretary-today](demo/gifs/secretary-today.gif) | tui | 今日の優先順位をレーンで表示。blocked は赤く沈む |
| [agent-constellation](demo/gifs/agent-constellation.gif) | device × events | エージェントたちが星座になる。dispatch で線が走る |
| [collapse-arcade](demo/gifs/collapse-arcade.gif) | worker-data | 崩壊率の高いエージェントが敵に。撃墜=レビュー |
| [collapse-siren](demo/gifs/collapse-siren.gif) | worker-data × chiptune × events | 崩壊率が閾値を越えると端末が不協和音で騒ぎ出す |
| [desk-weather](demo/gifs/desk-weather.gif) | device | リポジトリの調子が机の天気になる。dirty は曇り |
| [git-weather](demo/gifs/git-weather.gif) | git-observe × device | churn が強い日は嵐。静かな日は快晴 |
| [pomodoro-forge](demo/gifs/pomodoro-forge.gif) | chiptune × device | 集中で鉱石を掘り、commit で精錬する鍛冶ポモドーロ |
| [focus-forge](demo/gifs/focus-forge.gif) | focus-log × chiptune × device | 自己申告じゃない pomodoro。実測の集中だけが鎚を振る |
| [focus-aquarium](demo/gifs/focus-aquarium.gif) | focus-log | 一日の集中記録が夜、魚群になって泳ぎ出す |
| [focus-tally](demo/gifs/focus-tally.gif) | focus-log × tui | 今日なにをしたかが端末の棒グラフに積み上がる |
| [ume-tamagotchi](demo/gifs/ume-tamagotchi.gif) | device | うめこを育てる。投稿すると喜び、滞ると拗ねる |
| [routing-slot](demo/gifs/routing-slot.gif) | worker-data | worker 配車がスロットマシンに。適材適所で jackpot |
| [routing-radar](demo/gifs/routing-radar.gif) | worker-data × tui | 配車の的中率を confidence バーで一望するレーダー |
| [chiptune-clock](demo/gifs/chiptune-clock.gif) | chiptune × device | 時刻を 8bit の鐘で告げる置時計 |
| [chiptune-themes](demo/gifs/chiptune-themes.gif) | chiptune × events | イベント種別ごとにテーマ曲が付く。deploy 成功はファンファーレ |
| [commit-constellation](demo/gifs/commit-constellation.gif) | git-observe × device | コミット著者が星になる。寄与が大きいほど明るい |

どの app も `apps/<name>/src/` の数ファイル。既存を一切壊さず追加できる = このキットの拡張性そのもの。

## デモが腐らない仕組み

スクリーン録画の GIF はコードが変わった瞬間に嘘になる。umeplay の GIF は全部こう作る:

```
app の demo()  ──ANSI フレーム列──▶  core-termgif  ──▶  demo/gifs/<name>.gif
（seeded 乱数・決定論的）              （GIF89a+LZW+8x8フォント・依存ゼロ）
```

- 各 app は `src/demo.ts` で `demo(): DemoSpec` を export する（規約は [core-termgif/README](packages/core-termgif/README.md)）
- `npm run gifs` が全 app の GIF と `manifest.json` を再生成、`npm run showcase` がギャラリー HTML を再生成
- 同じコード → 同じ GIF。**デモの鮮度 = リポジトリの誠実さ**

フォントは IBM VGA 時代の Public Domain ビットマップ（[dhepper/font8x8](https://github.com/dhepper/font8x8)）+ 手描きグリフ。ひらがなも泳ぐ。

## 新しい遊び / デバイスの足し方

`CONTRIBUTING.md` を参照。要点だけ:

- 新しい遊び → `apps/<name>/` を1つ（`index.ts` にロジック・`cli.ts` に実行・`demo.ts` にGIFデモ）
- 新デバイス → `packages/core-device/src/devices/<name>.ts` + `select.ts` に1行
- 新イベント → `contracts/events.ts` の `PlayEvent` に型を1つ追加

## テスト

```sh
npm run check   # tsc --noEmit + vitest（core を真面目に、app は smoke）
```

`demo/wiring.test.ts` = 1本のイベントを4アプリが疎結合で受ける実証。
`demo/showcase.test.ts` = 全アプリの実レンダリングを出力。
core-termgif の LZW は独立実装デコーダとの roundtrip でテストしている。

## License

MIT（[LICENSE](LICENSE)）。フォントデータの出自は Public Domain（core-termgif/README 参照）。
