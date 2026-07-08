# umeplay 🎛️

> **端末で遊びが生える組み立てキット** — A construction kit where terminal toys grow.
> English → **[README.md](README.md)**

[![CI](https://github.com/UMEBOSHIISAN/umeplay/actions/workflows/ci.yml/badge.svg)](https://github.com/UMEBOSHIISAN/umeplay/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](package.json)
[![dependencies: zero](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](package.json)
[![demos: rendered from code](https://img.shields.io/badge/demos-rendered%20from%20code-ff69b4.svg)](#デモが腐らない仕組み)

![umeplay](demo/banner.gif)

> **このリポジトリにはスクリーンショットが1枚も無い。** 冒頭のバナーすら、自前の
> GIF89a エンコーダがコードから焼いた GIF だ。`npm run banner` を叩けば同じバイト列が返る。

7つの部品（`packages/core-*`）を、1枚の契約（`contracts/`）でつなぐと、
水槽が泳ぎ、git 履歴が歌い、机に天気が降る。**アプリを作るんじゃない。部品を掛け合わせると遊びが生える。**

- **依存ゼロ** — ランタイム依存なし。TypeScript + Node だけ（devDeps は tsc / vitest / esbuild のみ）
- **全部ターミナル** — ビルドもブラウザも実機も不要。`npm run play <名前>` して3秒で動く
- **デモが腐らない** — README の GIF は `npm run gifs` がコードから再生成する

> **数え方の注記:** `core-*` パッケージは物理的には8個ある。うち7個が遊びを組み立てる部品で、
> 8個目の `core-termgif` はデモ GIF を焼くメタ部品（[デモが腐らない仕組み](#デモが腐らない仕組み)）。
> 「7つの部品で21の遊び」は前者の数え方。

## 使い方

コマンドの羅列じゃなく、初日の体験として読んでほしい:

```sh
npm install              # 依存導入（typescript + vitest + esbuild のみ）
npm run hello            # 冒頭に映画的スプラッシュ、そのあと Undertale 風の案内役が中へ（UMEPLAY_NO_SPLASH=1 で省略）
npm run tour             # 座って眺めるだけ。全21本を8秒ずつ、セーブポイント風の幕間つき
npm run play daily       # 「きょうのおもちゃ」。日付シードで1本（同じ日は同じ結果）
npm run workshop         # 部品を目で選んで、自分のおもちゃを生やす
```

そのあとは、日常のコマンド:

```sh
npm run play             # 遊び一覧（tagline 付き）
npm run play tamagotchi  # 名前は部分一致。曖昧なら番号選択メニュー（TTY）・Ctrl+C で終了
npm run play random      # ランダムに1本起動
npm run check            # typecheck + テスト（130本超・全緑。おもちゃが増えるほど増える）
npm run gifs             # 全デモGIFをコードから再生成 → demo/gifs/
npm run showcase         # ギャラリー demo/index.html を再生成
npm run banner           # ヒーローバナー demo/banner.gif を再生成
npm run frontier         # 組み合わせ地図 demo/frontier.gif を再生成
```

> **`npx umeplay` は準備中。** bin エントリと事前バンドルは仕込み済みだが、パッケージは
> まだ publish していない — 今は repo を clone して上の `npm run` を使う。

実機なしで全部動く（`core-device` の既定は mock ドライバ）。

## 扉を選ぶ

来た理由に合わせて、入口は3つ:

- 🎮 **ターミナルで遊びたい人** — `npm run play` で一覧、`npm run play random` で運試し。
  自分のおもちゃが欲しくなったら `npm run workshop`: `j`/`k`+`space` で `core-*` 部品を
  目で選ぶと、レシピ図がライブで組み変わり、`Enter` でその部品入りのおもちゃが生える
  （既存おもちゃと同じ部品構成なら「おなじ血筋!」判定）。CLI 派なら `npm run new -- my-toy`
  で約60秒 — 緑のテスト・動く CLI・GIF まで最初から付いてくる。
- 🔌 **ガジェット勢（M5Stack・マクロパッド）** — まず `npm run play device-mirror` で
  仮想 M5Stack 液晶が端末に灯るのを見て、**[docs/DEVICES.md](docs/DEVICES.md)** を読んで
  約50行でドライバを書く。実機ドライバは **wanted（募集中）で未実装** — その空白があなたの
  PR の出番。謝るべき穴ではなく、設計どおり。
- 🤖 **エージェント勢** — おもちゃ群は自律エージェントの実挙動を可視化する。
  [git-replay](demo/gifs/git-replay.gif) は human と AI のコミットを色分けし、
  [commit-symphony](demo/gifs/commit-symphony.gif) は AI 共著コミットを1オクターブ上で鳴らす。
  [agent-constellation](demo/gifs/agent-constellation.gif)・
  [routing-radar](demo/gifs/routing-radar.gif)・
  [collapse-siren](demo/gifs/collapse-siren.gif) は dispatch・routing・崩壊率を
  「観られるもの」に変える。土台の疎結合イベント設計は
  [3層アーキテクチャ](#3層アーキテクチャ)に。

## 3層アーキテクチャ

```
apps/*          遊び（薄い・core を組み合わせるだけ）
   │ import only ↓
packages/core-* 部品（再利用単位）
   │ import only ↓
contracts/      型・スキーマ（依存ゼロの葉）
```

**一方向依存のみ**（app → core → contracts）。app 同士は依存しない。
連携は [`contracts/events.ts`](contracts/events.ts) の `PlayEvent` 型経由の疎結合 —
producer は誰が聞くか知らない。consumer は誰が出したか知らない。この共通語彙がキットの芯。

![how it works](demo/how-it-works.gif)

> **1つのイベント、3つのおもちゃ、互いを知らない。** 1本の `PlayEvent` がバスに乗ると、
> 水槽・机の天気・chiptune が同時に反応する — どれも他の存在を知らないまま。`npm run diagram`
> がコードから描くので、図がコードとズレない。

![event-loom](demo/gifs/event-loom.gif)

> `npm run play event-loom` — 1本の EventBus に現実的なイベント列を流し、**疎結合な2つの購読者**
> （色付きティッカー＋種別カウンタ）が同時に反応する。

## 部品カタログ（packages/）

`core-*` は8個。うち7個が遊びを組み立て、8個目の `core-termgif` は全デモ GIF を焼くメタ部品。

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

## 遊びカタログ（apps/ — 全21本・全部GIF付き）

**全GIFギャラリー → [demo/index.html](demo/index.html)** — 自己完結・core フィルタ・ダーク/ライト対応・
外部参照ゼロ（`npm run showcase` で再生成）。

| app | 部品の掛け合わせ | 一言 |
|---|---|---|
| [ascii-aquarium](demo/gifs/ascii-aquarium.gif) | contracts | task.done で魚が増える ASCII 水槽。夜になると月が出る |
| [event-loom](demo/gifs/event-loom.gif) | events × tui | 1本のバスに流れる全イベントを織って見せる万能ビューア |
| [commit-symphony](demo/gifs/commit-symphony.gif) | git-observe × chiptune | git 履歴が 8bit の曲になる。AI 共著は1オクターブ上で鳴く |
| [git-replay](demo/gifs/git-replay.gif) | git-observe × tui | リポジトリの歴史をタイムラプス再生。人間と AI を色分け |
| [secretary-today](demo/gifs/secretary-today.gif) | tui | 今日の優先順位をレーンで表示。blocked は赤く沈む |
| [agent-constellation](demo/gifs/agent-constellation.gif) | device × events | エージェントたちが星座になる。dispatch で線が走る |
| [collapse-arcade](demo/gifs/collapse-arcade.gif) | worker-data | 崩壊率の高いエージェントが敵に。撃墜=レビュー。ベストスコアは RPG セーブ風に `~/.umeplay/save.json` へ記録 — 🏆 Issue テンプレで自慢できる |
| [collapse-siren](demo/gifs/collapse-siren.gif) | worker-data × chiptune × events | 崩壊率が閾値を越えると端末が不協和音で騒ぎ出す |
| [device-mirror](demo/gifs/device-mirror.gif) | device | 実機を買う前に、実機が見える。端末に映る仮想 M5Stack 液晶へ、実ドライバが受け取るのと同じ `DrawCommand` をミラー |
| [desk-weather](demo/gifs/desk-weather.gif) | device | リポジトリの調子が机の天気になる。dirty は曇り |
| [git-weather](demo/gifs/git-weather.gif) | git-observe × device | churn が強い日は嵐。静かな日は快晴 |
| [pomodoro-forge](demo/gifs/pomodoro-forge.gif) | chiptune × device | 集中で鉱石を掘り、commit で精錬する鍛冶ポモドーロ |
| [focus-forge](demo/gifs/focus-forge.gif) | focus-log × chiptune × device | 自己申告じゃない pomodoro。実測の集中だけが鎚を振る |
| [focus-aquarium](demo/gifs/focus-aquarium.gif) | focus-log | 一日の集中記録が夜、魚群になって泳ぎ出す |
| [focus-tally](demo/gifs/focus-tally.gif) | focus-log × tui | 今日なにをしたかが端末の棒グラフに積み上がる |
| [ume-tamagotchi](demo/gifs/ume-tamagotchi.gif) | contracts | うめこを育てる。投稿すると喜び、滞ると拗ねる |
| [routing-slot](demo/gifs/routing-slot.gif) | worker-data | worker 配車がスロットマシンに。適材適所で jackpot |
| [routing-radar](demo/gifs/routing-radar.gif) | worker-data × tui | 配車の的中率を confidence バーで一望するレーダー |
| [chiptune-clock](demo/gifs/chiptune-clock.gif) | chiptune × device | 時刻を 8bit の鐘で告げる置時計 |
| [chiptune-themes](demo/gifs/chiptune-themes.gif) | chiptune × events | イベント種別ごとにテーマ曲が付く。deploy 成功はファンファーレ |
| [commit-constellation](demo/gifs/commit-constellation.gif) | git-observe × device | コミット著者が星になる。寄与が大きいほど明るい |

どの app も `apps/<name>/src/` の数ファイル。既存を一切壊さず追加できる = このキットの拡張性そのもの。

## ガジェットを繋ぐ

全21本が **実機ゼロ**で動く — `core-device` の既定が mock ドライバで、その既定こそが
全 app・全 CI を「何も挿さずに」回せる理由。でも `Device` HAL は本物だ。小さな画面と
ボタンが1つあれば、umeplay は実機パネルを駆動できる。

![device-mirror](demo/gifs/device-mirror.gif)

> `npm run play device-mirror` — *実機を買う前に、実機が見える。* 仮想 M5Stack Core 液晶
> （実解像度 320×240・`[A][B][C]` ボタン・LED）を端末に描き、実ドライバが受け取るのと
> 同じ `DrawCommand` をそのままミラーする。

ドライバは約50行 — 6メソッドを実装し、`select.ts` に `case` を1行足すだけで、既存の全
おもちゃが無改修であなたのガジェット上で動く。実機の M5Stack / Ajazz AKP153 ドライバは
**wanted（募集中）で未実装** — インターフェースのツアー、約50行の写経ガイド、PR チェック
リストは **[docs/DEVICES.md](docs/DEVICES.md)** に。

## Human × AI — リポジトリ自身がそれを知っている

umeplay は human と AI エージェントが並んで作った。git 履歴には今も `Co-Authored-By`
トレーラーが残り、それを証している。ここではそれは脚注ではなく、遊べる。
[commit-symphony](demo/gifs/commit-symphony.gif) はこのリポジトリ自身のログを歌い、
AI 共著コミットを1オクターブ上で鳴らす。[git-replay](demo/gifs/git-replay.gif) は
同じ履歴を human と AI の寄与で色分けして再生する。協働を可視化するおもちゃが、
自分を作った協働そのものに向いている。

## デモが腐らない仕組み

スクリーン録画の GIF はコードが変わった瞬間に嘘になる。umeplay の GIF は全部こう作る:

```
app の demo()  ──ANSI フレーム列──▶  core-termgif  ──▶  demo/gifs/<name>.gif
（seeded 乱数・決定論的）              （GIF89a+LZW+8x8フォント・依存ゼロ）
```

- 各 app は `src/demo.ts` で `demo(): DemoSpec` を export する（規約は [core-termgif/README](packages/core-termgif/README.md)）
- `npm run gifs` が全 app の GIF と `manifest.json` を再生成、`npm run showcase` がギャラリー HTML を、
  `npm run banner` がヒーローバナーを再生成
- 同じコード → 同じ GIF。**デモの鮮度 = リポジトリの誠実さ**
- **CRT フィルタ（任意）** — `npm run gifs -- --crt ascii-aquarium` で、任意のおもちゃを
  自前の走査線／グロー／ビネット後処理（cool-retro-term の質感・コードは自前）に通して
  `demo/crt/` に出力する。正本の `demo/gifs/` や `manifest.json` には一切触れない純粋な追加。

<img src="demo/crt/ascii-aquarium.gif" alt="CRT フィルタ版 ascii-aquarium" width="360">

フォントは IBM VGA 時代の Public Domain ビットマップ（[dhepper/font8x8](https://github.com/dhepper/font8x8)）+ 手描きグリフ。ひらがなも泳ぐ。

## 新しい遊びの生やし方（60秒）

新しいおもちゃは1コマンドで足場ができる:

```sh
npm run new -- my-toy    # apps/my-toy/ を生成（6ファイル: package.json /
                         # tsconfig / src/index.ts / src/cli.ts / src/demo.ts / test）
npm run check            # typecheck + テスト（生成直後から緑）
npm run play my-toy      # 起動して見る（Ctrl+C で終了）
npm run gifs -- my-toy   # demo/gifs/my-toy.gif を生成
```

生成された時点で `check` が通り、`play` で動き、GIF まで出る — だから「動いている土台」から
書き換えて育てる。あとは `package.json` に `@umeplay/*` core を足して部品を掛け合わせるだけ。

手動で足す場合や、新しい core / デバイス / イベントの足し方は **[CONTRIBUTING.md](CONTRIBUTING.md)** を参照。

## 組み合わせのフロンティア

8つの `core-*` 部品は **28通り**にペアを組める。今日その **13マスが埋まっていて**
（=実在するおもちゃがある）、**残り15マスは空いている**。この地図は `npm run frontier` が
`manifest.json` から実計算して描くので、嘘をつけない — 2つの部品を本当に掛け合わせた
おもちゃがある時だけマスが光る。`?` が明滅する暗いマスが、まだ誰も作っていない組み合わせだ。

![組み合わせのフロンティア](demo/frontier.gif)

> **28通りの組み合わせ — 13が探索済み、15が未踏。空きマスはあなたのもの。**

いま空きマスに座っているアイデアを6本。どれも今日は未実装 — つまり招待状で、
それぞれ `npm run new` 一発ぶんの距離にある:

| アイデア | 掛け合わせる2部品 | 何が起きるか |
|---|---|---|
| **Sweaty Console** | `worker-data × device` | エージェントの崩壊率で実機パネルの LED が赤く明滅する |
| **TUI Rave** | `tui × chiptune` | 描画バーが 8bit 音と同期する — 端末が視覚楽器になる |
| **Commit Flipbook** | `git-observe × termgif` | 1日のコミットが1本のパラパラ漫画 GIF になる |
| **Whisper Bus** | `events × focus-log` | 集中が切れると「ため息」イベントが出て、全おもちゃに波及する |
| **Panel Deck** | `device × tui` | 秘書の優先レーンを、実機 M5Stack パネルにそのままミラー |
| **Blame Radar** | `git-observe × worker-data` | コミット著者と配車データを掛け合わせ、どのエージェントが実際に出荷したかを見る |

新しい **部品** はおもちゃより速くフロンティアを広げる。`core-*` を1個足すと、
既存の8部品すべてと一度にペアを組める — 空きマスの1行がまるごと増える。
[`toy-idea` を掴む](../../issues/new?template=toy-idea.yml) か
[新しい core を提案](../../issues/new?template=new-core.yml)。

## このキットは生えつづける

umeplay は「完成したおもちゃ箱」じゃない。新しい遊びが生えつづけるキットだ。
生やし方は4通りあって、しかも掛け合わさって増える:

- 🧸 **新しいおもちゃ** — `npm run new -- my-toy` で約60秒。おもちゃ1個 =
  `apps/` の数ファイルで、既存を一切壊さずに足せる。ネタに詰まったら、はじめの1本は
  お題から選ぶのもいい — [`toy-idea` の Issue 一覧](../../issues?q=is%3Aissue+is%3Aopen+label%3Atoy-idea)を眺めて1本作る。
- 🧩 **新しい部品（core）** — ここが効く。`core-*` を1個足すと、増えるのは *1つ* じゃない。
  既存のどのおもちゃと掛け合わせても新しい遊びになる。3つの既存 core と掛ければ、
  その分の組み合わせがタダで生える — この組合せ爆発こそが、このキットの正体。
- 🔌 **新しいデバイスドライバ** — 6メソッドを実装すれば、既存の全おもちゃが無改修で
  あなたのガジェット上で動く。実機ドライバは wanted（募集中）で未実装:
  **[docs/DEVICES.md](docs/DEVICES.md)**。
- 📡 **新しいイベント** — [`contracts/events.ts`](contracts/events.ts) の `PlayEvent`
  型に1行足すだけで、全 producer / consumer が自動で受け取れる。共通語彙がキット全体で
  一気に広がる。

> **オーナー（うめぼし）から:** これを置いて立ち去るつもりはない。私自身、これからも
> 部品とおもちゃを足しつづける — それがこのリポジトリの本質だから。完成品というより、
> 私が種をまきつづける庭だと思ってほしい。あなたも隣で種をまいていい。おもちゃでも、
> 部品でも、ドライバでも、作ったら見せてほしい。

だから見せてほしい。アイデアは Issue に、動くものは PR に:

- 🧸 [おもちゃを提案](../../issues/new?template=toy-idea.yml) ·
  🧩 [新しい部品を提案](../../issues/new?template=new-core.yml) ·
  🔌 [デバイスドライバを持ち込む](../../issues/new?template=device-driver.yml) ·
  🏆 [collapse-arcade のスコアを自慢](../../issues/new?template=high-score.yml)
- PR 歓迎 — チェックリストは [CONTRIBUTING.md](CONTRIBUTING.md) と
  [プルリクエストテンプレート](.github/PULL_REQUEST_TEMPLATE.md) に。

## テスト

```sh
npm run check   # tsc --noEmit + vitest（core を真面目に、app は smoke）
```

`demo/wiring.test.ts` = 1本のイベントを4アプリが疎結合で受ける実証。
`demo/showcase.test.ts` = 全アプリの実レンダリングを出力。
core-termgif の LZW は独立実装デコーダとの roundtrip でテストしている。**130本超・全緑
（おもちゃ・部品・CRT/frontier レンダラが増えるたびに増える）。**

## License

MIT（[LICENSE](LICENSE)）。フォントデータの出自は Public Domain（[core-termgif/README](packages/core-termgif/README.md) 参照）。
