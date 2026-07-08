# umeplay 売り文句集（COPY）

> README / SNS / showcase / リリースノートで使い回す公式コピー。
> トーン: 遊び心 × 技術的誠実。「盛らない・でも楽しさは全開」。

## タグライン（メイン）

| 用途 | JP | EN |
|---|---|---|
| 一言 | **端末で遊びが生える組み立てキット** | **A construction kit where terminal toys grow** |
| ヒーロー | 9つの部品を組むだけで、水槽が泳ぎ、git履歴が歌い、机に天気が降る。 | Wire 9 cores together — an aquarium swims, your git history sings, weather falls on your desk. |
| 哲学 | アプリを作るんじゃない。部品を掛け合わせると遊びが**生える**。 | You don't build apps. You cross parts, and play **grows**. |
| 技術 | 依存ゼロ・TypeScript・全部ターミナル。GIFデモまでコードから再現可能。 | Zero deps, TypeScript, all in your terminal. Even the demo GIFs are reproducible from code. |

## サブコピー（文脈別）

- **なぜ端末?** — いちばん近くにある画面だから。ビルドもブラウザも要らない。`npm run aquarium` して3秒で泳ぐ。
- **なぜ部品?** — 遊びは思いつきで増える。思いつきの速度で作れる構造だけが生き残る。app 1個 = ファイル1枚。
- **なぜイベント?** — `PlayEvent` という共通語彙が producer と consumer を疎結合にする。水槽は「誰がタスクを終えたか」を知らないまま、魚を1匹増やす。
- **なぜGIFを自前で焼く?** — スクリーン録画は腐る。コードから焼いたGIFは、コードが生きてる限り新鮮。デモの鮮度=リポジトリの誠実さ。
- **8bitフォントの由来** — IBM VGA 時代の Public Domain フォント（font8x8）+ 手描きグリフ。ひらがなが泳ぐ端末は、ちょっといいでしょ。
- **どうやって作る?（workshop）** — 部品を目で選ぶと、おもちゃが生える。`npm run workshop` で `core-*` をカーソルで選ぶと、レシピ図がライブで組み変わり、Enter でそのおもちゃが生える。

## app別ワンライナー（22本）

| app | 一言 |
|---|---|
| ascii-aquarium | task.done で魚が増える ASCII 水槽。夜になると月が出る |
| event-loom | 1本のバスに流れる全イベントを織って見せる万能ビューア |
| commit-symphony | git 履歴が 8bit の曲になる。AI 共著は 1 オクターブ上で鳴く |
| git-replay | リポジトリの歴史をタイムラプス再生。人間と AI を色分け |
| secretary-today | 今日の優先順位をレーンで表示。blocked は赤く沈む |
| agent-constellation | エージェントたちが星座になる。dispatch で線が走る |
| collapse-arcade | 崩壊率の高いエージェントが敵に。撃墜=レビュー |
| collapse-siren | 崩壊率が閾値を越えると端末が不協和音で騒ぎ出す |
| device-mirror | 実機を買う前に、実機が見える。端末の仮想 M5Stack 液晶へ、実ドライバが受け取るのと同じ DrawCommand をミラー |
| desk-weather | リポジトリの調子が机の天気になる。dirty は曇り |
| git-weather | churn が強い日は嵐。静かな日は快晴 |
| pomodoro-forge | 集中で鉱石を掘り、commit で精錬する鍛冶ポモドーロ |
| focus-forge | 自己申告じゃない pomodoro。実測の集中だけが鎚を振る |
| focus-aquarium | 一日の集中記録が夜、魚群になって泳ぎ出す |
| focus-tally | 今日なにをしたかが端末の棒グラフに積み上がる |
| ume-tamagotchi | うめこを育てる。投稿すると喜び、滞ると拗ねる |
| routing-slot | worker 配車がスロットマシンに。適材適所で jackpot |
| routing-radar | 配車の的中率を confidence バーで一望するレーダー |
| chiptune-clock | 時刻を 8bit の鐘で告げる置時計 |
| chiptune-themes | イベント種別ごとにテーマ曲が付く。deploy 成功はファンファーレ |
| commit-constellation | コミット著者が星になる。寄与が大きいほど明るい |
| cpu-diner | マシンの負荷が営む ASCII 食堂。CPU が忙しいと客が押し寄せ、暇だと店員が居眠りする |

## コミュニティ / 拡張性

> README の「生えつづける」節・Issue/PR 導線・OSS 招待で使い回す公式コピー。

| 用途 | JP | EN |
|---|---|---|
| 掛け算 | 部品を1個足すと、遊びは掛け算で増える。 | Add one part, and the play multiplies. |
| 庭 | このリポジトリは完成品じゃない。生えつづける庭。 | This repo isn't a finished product — it's a garden that keeps growing. |
| 招待 | あなたのおもちゃ・部品・ドライバを見せてほしい。 | Show us your toy, your part, your driver. |
| workshop | 部品を目で選ぶと、おもちゃが生える。 | Pick parts by eye, and a toy grows. |
| お題 | はじめての1本は、お題から選ぶのもいい。 | Your first toy can start from a prompt. |

## 組み合わせフロンティア（combination）

> README「Combination Frontier / 組み合わせのフロンティア」節・SNS・showcase で使い回す公式コピー。
> オーナー方針の目玉 =「組み合わせの面白さ」。ここが一番のフックだと思って使う。

| 用途 | JP | EN |
|---|---|---|
| 地図 | 10部品 × 45通りのペア。大半はまだ空き。`npm run frontier` が実数を焼く。空きマスはあなたのもの。 | 10 parts, 45 pairs — most still empty. `npm run frontier` burns the live count. The empty cells are yours. |
| 掛け算 | 部品を1個足すと、遊びは足し算じゃなく掛け算で増える。 | Add one part and the play grows by multiplication, not addition. |
| 未踏 | いちばん面白いおもちゃは、まだ誰も掛け合わせていない2つの部品。 | The most interesting toy is the two parts nobody has crossed yet. |
| レシピ | 「これとこれを組み合わせたら面白いじゃん」を、みんなが試せる。 | "What if I crossed this with that?" — now anyone can. |
| 拡張 | ラズパイなら今日そのまま動く。ESP32 や M5Stack はドライバ募集中。 | Runs on a Raspberry Pi today; ESP32 and M5Stack drivers are wanted. |
| 空きマス | 光っていないマスは、穴じゃない。招待状だ。 | An unlit cell isn't a gap — it's an invitation. |

## SNS 投稿案（X向け・下書き）

> ⚠️ 投稿は human 判断。ここは下書き置き場。

**案1（開発物語）**
ターミナルで魚を飼い始めた。task が終わると1匹増える。
9つの部品を組み合わせるだけで、水槽も、8bitの曲も、机の天気も生えてくる。
遊びの組み立てキット umeplay、OSSにしました🎛️

**案2（技術フック）**
デモGIFをスクリーン録画するの、やめました。
ANSI出力→GIF89a を依存ゼロのTypeScriptで焼くと、デモがコードと一緒に生き続ける。
LZWも8bitフォントも全部手元。#umeplay

**案3（哲学）**
「アプリを作る」より「部品を掛け合わせたら遊びが生えた」の方が楽しい。
core 9個 × 契約1枚 = 遊び22本。掛け算はまだ終わらない。

**案4（組み合わせフロンティア）**
10個の部品でできる組み合わせは45通り。その大半はまだ誰も掛け合わせていない。
地図は `npm run frontier` が自動で実数を焼くから、埋まった数はいつも本物。
「これとこれを混ぜたら面白いじゃん」を、みんなで埋めていくキットです🎛️ #umeplay

## リリースノート用ボイラープレート

umeplay v0.x — 端末で遊びが生える組み立てキット
- 9 cores × 1 contract = 22 toys, all in your terminal
- Zero-dependency GIF renderer included (your demos never rot)
- MIT License. Play responsibly.
