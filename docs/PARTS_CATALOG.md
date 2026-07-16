# パーツ設計カタログ — 新規 54 種

> 設計: CC (Claude Code) 2026-07-16 · 前提: `docs/PARTS_REFACTOR.md`（role 分類 R2 / API 規約 R5 / 語彙統制 R4）
> 全パーツ共通の制約: **zero-dependency（Node 標準 + pure 関数のみ）/ index.ts pure / 乱数 seeded / I/O injectable / vitest 全 mock で green**
> status はすべて `designed`。実装は §4 のバッチ順で CO へ委譲する。

記法: `produces` / `consumes` は PlayEvent kind。`(new)` は新イベント family（R4 ルール: 1 パーツ 1 family まで）。
API sketch は公開シグネチャの骨のみ。命名・型詳細は実装時に既存パーツの流儀へ合わせる。

---

## 1. source — 世界を観測してイベントを生む（12 種）

### 1. core-clock
時をイベントにする。tick・時報・日付 seed。
- produces: `clock.tick`, `clock.chime` (new: clock)
- API: `createClock({ now?, intervalMs }): Producer` / `dateSeed(date): number` / `toPlayEvents(ticks)`
- deps: contracts · test: fake timer 注入で tick 列を検証

### 2. core-moon
月齢・日の出入りを純計算で出す天体パーツ。ネットワーク不要。
- produces: `sky.phase` (new: sky)
- API: `moonPhase(date): { phase: number; name: string }` / `sunTimes(date, lat, lon)`
- deps: contracts · test: 既知日付の月齢/日の出を固定値で検証

### 3. core-weather-drop
天気 JSON ドロップファイル（外部 cron が置く）を読む。fetch はしない。
- produces: `sky.weather`（sky family に相乗り）
- API: `readWeatherDrop(path, { readFile? }): Weather | null` / `toPlayEvents(w)`
- deps: contracts · test: fixture JSON / 欠落・破損で null（fail-soft）

### 4. core-fs-observe
ディレクトリを見張り、ファイルの増減・変更をイベント化。
- produces: `fs.change` (new: fs)
- API: `watchDir(path, { watcher? }): Producer` / `snapshotDiff(before, after): FsChange[]`
- deps: contracts · test: mock watcher に手動でイベントを流す

### 5. core-proc-observe
プロセス一覧のスナップショット差分（起動/終了/CPU 食い）を観る。
- produces: `proc.change` (new: proc)
- API: `parsePs(stdout): Proc[]` / `diffProcs(a, b)` / `createProcObserver({ exec? })`
- deps: contracts · test: `ps aux` 出力 fixture の parse / diff

### 6. core-battery
バッテリー残量・充電状態（`pmset -g batt` parse・injectable exec）。
- produces: `power.state` (new: power)
- API: `parsePmset(stdout): Battery` / `createBatteryFeed({ exec?, intervalMs })`
- deps: contracts · test: 充電中/放電中/AC の実出力 fixture

### 7. core-net-observe
ping RTT・インターフェース up/down で「家のネットの機嫌」を観る。
- produces: `net.pulse` (new: net)
- API: `parsePing(stdout): Rtt` / `createNetFeed({ exec?, host, intervalMs })`
- deps: contracts · test: ping 出力 fixture / タイムアウト系 fixture

### 8. core-clipboard
クリップボード変化の観測（`pbpaste` ポーリング・injectable exec）。中身は長さ/種別のみ通知（プライバシー: 本文をイベントに載せない）。
- produces: `clip.change` (new: clip)
- API: `createClipboardFeed({ exec?, intervalMs })` / `classify(text): "url"|"code"|"text"`
- deps: contracts · test: exec mock の返り値遷移で change 発火を検証

### 9. core-agenda
Markdown TODO / MINI_NEXT 風のプレーンテキストから task イベントを起こす。
- produces: `task.done`（既存 kind 再利用）, `task.added` (new: task 拡張)
- API: `parseAgenda(text): AgendaItem[]` / `diffAgenda(a, b)` / `toPlayEvents(diff)`
- deps: contracts · test: checkbox 増減 fixture

### 10. core-mailbox-drop
汎用ブリッジ: inbox ディレクトリに置かれた JSON をそのまま PlayEvent として飲む。**どんな外部システムでも toygarden に接続できる口**。
- produces: 任意（JSON 内の kind を検証して通す）
- API: `readMailbox(dir, { readFile?, validate }): PlayEvent[]` / `createMailboxFeed(dir, opts)`
- deps: contracts · test: 正常 JSON / kind 不正 JSON（落とさず skip）

### 11. core-keys
キー入力ストリームを source として共通化（各 app の raw-mode 処理を吸い上げる先）。
- produces: `input.key` (new: input)
- API: `createKeySource({ stdin? }): Producer & { close() }` / `parseKey(buf): Key`
- deps: contracts · test: バッファ列（矢印・Ctrl-C・かな）の parse

### 12. core-dice
エントロピー供給源。seeded RNG・ダイス・シャッフル・重み付き抽選を1箇所に。
- produces: なし（pure。他パーツが使う道具）
- API: `seeded(seed): () => number` / `roll(rng, sides)` / `shuffle(rng, arr)` / `weighted(rng, table)`
- deps: contracts · test: 同 seed 同結果 / 分布の粗い検定

## 2. transform — イベント/データを加工する（12 種）

### 13. core-life
セル・オートマトン（Life / rule30 / rule110）。盤面ステッパ。
- consumes/produces: なし（pure stepper。view と組む）
- API: `nextGen(grid): Grid` / `rule1d(row, ruleNum)` / `randomGrid(rng, w, h, density)`
- deps: contracts · test: グライダー既知軌道 / rule30 既知列

### 14. core-boids
群れシミュレーション（分離・整列・結合）。水槽や星座の群体挙動の共通化。
- API: `stepBoids(boids, params): Boid[]` / `spawn(rng, n, bounds)`
- deps: contracts · test: 2 羽の接近で分離力が働く等、性質ベース

### 15. core-physics
2D 粒子物理: 重力・バネ・壁バウンド・簡易衝突。
- API: `stepParticles(ps, { gravity, dt })` / `spring(a, b, k)` / `bounce(p, bounds)`
- deps: contracts · test: 自由落下の解析解と数値解の一致（誤差内）

### 16. core-noise
value noise / fbm / 1D-2D。plasma・地形・ゆらぎの共通土台。
- API: `noise1(seed)(x)` / `noise2(seed)(x, y)` / `fbm(noise, octaves)`
- deps: contracts · test: 同 seed 同値 / 値域 [0,1] / 連続性（隣接差分上限）

### 17. core-markov
イベント列・文字列から Markov 連鎖を学習して生成。
- API: `train(seq, order): Chain` / `generate(chain, rng, len)`
- deps: contracts · test: 決定的コーパス（1 遷移のみ）で完全再現

### 18. core-story
イベント列 → 物語文。テンプレート + 語彙表で「今日のできごと」を語る。
- consumes: 全 kind / produces: なし（`tell(events): string[]` が出口）
- API: `tell(events, { lang, rng }): string[]` / `registerPhrase(kind, templates)`
- deps: contracts · test: 固定イベント列 + 固定 seed → 固定文

### 19. core-stats
ローリング集計: 窓付き tally・EMA・ヒストグラム・パーセンタイル。
- consumes: 全 kind / produces: なし（集計値を返す道具）
- API: `createWindow(ms)` / `ema(alpha)` / `histogram(values, bins)` / `tally(events, keyFn)`
- deps: contracts · test: 手計算既知値と一致

### 20. core-rhythm
イベント列を拍グリッドに量子化。「commit の雨」を「4 分音符の列」へ。voice 系の前段。
- consumes: 全 kind / produces: `beat.tick` (new: beat)
- API: `quantize(events, bpm, at): Beat[]` / `createMetronome({ bpm, now? }): Producer`
- deps: contracts · test: 既知タイムスタンプ列の量子化結果

### 21. core-seasons
日付・天気 → 季節/時間帯テーマ（palette 名・mood 名）。view の着せ替えを一元化。
- consumes: `sky.weather` / produces: なし（`themeFor(date, weather?)` が出口）
- API: `themeFor(date, weather?): { palette, mood, emoji }`
- deps: contracts · test: 四季 + 昼夜の境界日時

### 22. core-lsystem
L-system 成長エンジン。**garden の名にふさわしい植物生成の核**。
- API: `expand(axiom, rules, n): string` / `turtle(cmds): Segment[]` / `PRESETS`（樹・草・藻）
- deps: contracts · test: 既知 L-system（Koch 等）の展開列一致

### 23. core-path
グリッド探索と迷路: A* / BFS / 迷路生成 / ランダムウォーク。
- API: `astar(grid, from, to)` / `genMaze(rng, w, h)` / `randomWalk(rng, steps)`
- deps: contracts · test: 既知グリッドの最短路長 / 迷路の連結性

### 24. core-mood
複数 source の融合 → マシン/主人の「機嫌」state machine。tamagotchi 系の脳。
- consumes: `sys.pulse`, `focus.activity`, `git.commit` / produces: `mood.change` (new: mood)
- API: `createMood(weights): { feed(e); current(): Mood }`（Mood = 5 状態 + 数値）
- deps: contracts · test: イベント注入シナリオ → 状態遷移表どおり

## 3. view — ターミナルに描く（12 種）

### 25. core-sprite
複数フレーム ASCII スプライトの共通フォーマットと再生機。既存 app の生き物たちを規格化。
- API: `parseSprite(text): Sprite` / `frameAt(sprite, t)` / `blit(grid, sprite, x, y)`
- deps: contracts · test: フレーム切替タイミング / 透明文字の合成

### 26. core-braille
点字 2x4 ドットで端末を疑似ピクセル画面にする高解像度キャンバス。
- API: `createCanvas(w, h)` / `set(x, y)` / `line(x0,y0,x1,y1)` / `render(): string[]`
- deps: contracts · test: 既知ドットパターンの点字コードポイント一致

### 27. core-chart
sparkline・バー・ゲージ・軸つきミニチャート。stats の相棒。
- API: `sparkline(values, w)` / `bar(value, max, w)` / `gauge(ratio)` / `axis(min, max)`
- deps: contracts · test: 既知系列の文字列出力固定

### 28. core-bigfont
8x8 内蔵フォント（core-termgif の font-data 移管）で端末に大文字バナーを描く。
- API: `bigText(s, { font?, kern? }): string[]` / `measure(s)`
- deps: contracts · test: 既知文字のビットマップ行一致
- 備考: font-data の所属を termgif → bigfont へ移し termgif が依存する（R5 依存規約の範囲内・Phase 2 で調整）

### 29. core-marquee
スクロールする帯・ニュースティッカー・電光掲示板。
- API: `createMarquee(text, w): { tick(): string }` / `compose(items, sep)`
- deps: contracts · test: tick ごとのオフセット列

### 30. core-dither
強度グリッド → ASCII 濃淡ランプ（` .:-=+*#%@`）。画像っぽい表現の共通化。
- API: `ditherToAscii(grid, ramp?)` / `floydSteinberg(grid, levels)`
- deps: contracts · test: 勾配グリッドの既知出力

### 31. core-plasma
デモシーン効果: plasma / トンネル / starfield / 波。noise の見せ場。
- API: `plasmaFrame(t, w, h, noise)` / `starfield(rng, n).tick()` / `waveFrame(t, w, h)`
- deps: contracts, core-noise · test: 同 t 同 seed 同フレーム

### 32. core-isometric
アイソメ格子の描画（花壇・畑・棚）。garden の区画表現。
- API: `isoGrid(w, h)` / `place(grid, x, y, tile)` / `render(grid): string[]`
- deps: contracts · test: 1 タイル配置の座標変換一致

### 33. core-window
枠・分割ペイン・重ね合わせの小さなレイアウトマネージャ。
- API: `box(w, h, { title })` / `hsplit(a, b, ratio)` / `overlay(base, layer, x, y)`
- deps: contracts · test: 枠線文字の位置 / 重ね順

### 34. core-confetti
祝祭エフェクト: 紙吹雪・花火・キラキラ。`deploy.success` / `task.done` の消費者。
- consumes: `deploy.success`, `task.done`
- API: `burst(rng, w, h): Particles` / `tick(ps)` / `render(ps): string[]`
- deps: contracts · test: 同 seed の粒子軌道固定

### 35. core-crtfx
CRT/走査線/グリッチのライブ後処理（termgif の crt.ts を実行時に一般化）。
- API: `applyScanlines(frame)` / `glitch(rng, frame, amount)` / `vignette(frame)`
- deps: contracts · test: 既知フレームの変換固定

### 36. core-garden-view
鉢・畝・成長段階つき植物の共通描画。lsystem の相棒で、garden の顔。
- API: `renderPlant(segments, stage)` / `pot(kind)` / `bed(plants, w)`
- deps: contracts, core-lsystem · test: 成長段階ごとの高さ単調増加

## 4. voice — 音を出す（6 種）

### 37. core-drums
パーカッション合成（noise burst / kick / hat）とパターンシーケンサ。chiptune の melodic に対する rhythm 側。
- consumes: `beat.tick`
- API: `renderDrumPCM(pattern, bpm)` / `PATTERNS`（4つ打ち・ブレイクビーツ等）
- deps: contracts, core-chiptune（encodeWav 再利用） · test: PCM 長・ピーク位置

### 38. core-scale
音楽理論: スケール・コード・進行。イベント → 和声のマッピング表。
- API: `scale(root, mode): Note[]` / `chord(root, kind)` / `progression(key, pattern)` / `mapToScale(value, scale)`
- deps: contracts · test: C major / A minor の既知構成音

### 39. core-say
macOS `say` の injectable ラッパ。toys がひとこと喋る（voice 名・速度・言語）。
- consumes: 任意（呼び側が文を作る。core-story と好相性）
- API: `createSpeaker({ exec?, voice, rate }): { say(text) }`（非 mac は no-op fail-soft）
- deps: contracts · test: exec mock への引数検証 / 非 mac no-op

### 40. core-morse
テキスト/イベント → モールス（音 or 点滅列）。body の LED と好相性。
- API: `toMorse(text): string` / `toTimings(morse, unitMs)` / `toPlayEvents(timings)`
- deps: contracts · test: SOS の符号・タイミング列

### 41. core-ambience
遅いデータ（sysmon・天気）から生成的アンビエントドローンを合成。
- consumes: `sys.pulse`, `sky.weather`
- API: `renderAmbiencePCM(state, seconds, seed)`（倍音・うなりを noise で変調）
- deps: contracts, core-chiptune, core-noise · test: 同入力同 PCM / クリップなし

### 42. core-jingle
名前つき効果音ライブラリ（success / fail / levelup / coin）。1 呼びで鳴る earcon 集。
- consumes: `deploy.success`, `task.done`, `agent.collapse`
- API: `jingle(name): Motif` / `playJingle(name, { play? })` / kind → jingle 名の既定マップ
- deps: contracts, core-chiptune · test: 全 name の Motif 妥当性（音域・長さ）

## 5. body — 物理デバイスを動かす（5 種）

### 43. core-macropad
AJAZZ AKP153 系マクロパッドの盤面を Device HAL に載せる（manifest 直接編集方式）。
- consumes: HAL 経由（既存 DrawCommand）
- API: `AjazzManifestDevice implements Device`（キー画像 = 描画先、押下 = `input.key` produce）
- deps: contracts, core-device · test: DrawCommand → manifest JSON 差分の固定
- 備考: 実機検証は human ゲート（デバイス書込は dry-run 既定）

### 44. core-led-matrix
汎用シリアル LED マトリクス駆動（プロトコルは M5StickC serial の流儀を踏襲）。
- API: `LedMatrixDevice implements Device`（W×H RGB フレーム → シリアルパケット）
- deps: contracts, core-device · test: フレーム → パケットのバイト列固定

### 45. core-webhook
Discord/Slack webhook を「表現先」として扱う body。injectable fetch・rate limit 内蔵。
- consumes: 任意（呼び側がフィルタ） / **既定 dry-run**（実送信は opt-in。外部送信=公開の原則）
- API: `createWebhookBody(url, { fetch?, dryRun = true, minIntervalMs })`
- deps: contracts · test: fetch mock / rate limit / dry-run で送信ゼロ

### 46. core-menubar
macOS メニューバー常駐表示（osascript / injectable exec）。toys の一行サマリの住処。
- API: `createMenubar({ exec? }): { set(text); clear() }`（非 mac no-op）
- deps: contracts · test: exec mock 引数 / 非 mac no-op

### 47. core-printer
レシートプリンタ風の「印字」出力。実プリンタ（lp）にも、ファイルにも吐ける。
- API: `createPrinter({ write? }): { print(lines) }` / `receipt(events): string[]`（罫線・合計欄つき）
- deps: contracts · test: 固定イベント列 → 固定レシート文字列

## 6. fabric — 配線・保存・記録の下回り（7 種）

### 48. core-replay
PlayEvent ストリームの JSONL 記録・再生。**決定論デモとデバッグの背骨**。
- API: `record(producer, { write? })` / `replay(jsonl, { speed, now? }): Producer`
- deps: contracts · test: record → replay 往復で列一致

### 49. core-scheduler
プロセス内 cron: 「毎分」「毎時 0 分」「n 秒ごと」をイベントで供給（setTimeout wheel・fake clock 対応）。
- produces: `clock.tick`（core-clock と同 family 共有）
- API: `createScheduler({ now?, setTimeout? }): { every(spec, fn); stop() }`
- deps: contracts · test: fake timer で発火時刻列を検証
- 備考: **プロセス内のみ**。launchd/cron 等 OS スケジューラ登録は絶対にしない（governance 領域）

### 50. core-scene
toy の場面遷移 state machine（title → play → pause → gameover）。入力と更新の交通整理。
- API: `createScenes(defs): { current; go(name); tick(dt); feed(key) }`
- deps: contracts · test: 遷移表どおり / 不正遷移は無視

### 51. core-score
スコア・レベル・実績の共通化（core-save に永続化）。
- consumes: 任意 / API: `createScore(rules): { feed(e); score; level; achievements }`
- deps: contracts, core-save · test: ルール表 → 実績解除条件

### 52. core-i18n
EN/JA 文字列テーブルと表示幅対応（workshop の display-width 知見をライブラリ化）。
- API: `t(key, lang)` / `displayWidth(s)` / `padDisplay(s, w)`（CJK 2 桁問題の SSOT）
- deps: contracts · test: 全角混在文字列の pad 後幅

### 53. core-asciicast
asciinema v2 (.cast) の記録・書き出し。termgif（GIF）と並ぶもう1つのデモ焼き。
- API: `framesToCast(frames, { fps }): string` / `castToFrames(text)`
- deps: contracts · test: 生成 .cast のヘッダ/イベント行を仕様どおり検証

### 54. core-svg-burn
フレーム列 → アニメ SVG（README 埋め込み可能・GIF よりテキスト差分に優しい）。
- API: `renderSvg(frames, { fps, palette }): string`
- deps: contracts · test: 生成 SVG の要素数・keyTimes 一致

---

## 7. 実装バッチ計画（CO 委譲単位・6 種/バッチ）

依存の浅い順・「garden らしさ」が早く見える順に並べる。**1 バッチ = 1 Codex タスク列（1 パーツ 1 タスクに分割可）**。

| バッチ | パーツ | ねらい |
|--------|--------|--------|
| B1 | core-dice, core-noise, core-life, core-lsystem, core-clock, core-stats | 依存ゼロの純関数群。全バッチの土台 |
| B2 | core-braille, core-sprite, core-chart, core-window, core-dither, core-i18n | view の骨格。以降の見た目が跳ねる |
| B3 | core-garden-view, core-isometric, core-plasma, core-confetti, core-marquee, core-bigfont | garden の顔ができる |
| B4 | core-scale, core-rhythm, core-drums, core-jingle, core-morse, core-ambience | 音の第二世代 |
| B5 | core-scene, core-score, core-replay, core-scheduler, core-keys, core-crtfx | toy の作り味が変わる fabric |
| B6 | core-moon, core-seasons, core-weather-drop, core-agenda, core-mood, core-story | 「今日」を感じる source/transform |
| B7 | core-fs-observe, core-proc-observe, core-battery, core-net-observe, core-clipboard, core-mailbox-drop | マシン観測の第二世代 |
| B8 | core-physics, core-boids, core-path, core-markov, core-sprite 拡張, 予備枠 | 動きの知性 |
| B9 | core-macropad, core-led-matrix, core-webhook, core-menubar, core-printer, core-say | body 拡張（human ゲート・実機検証つき） |

**バッチ共通 Done 条件**: 各パーツ manifest(`toygarden` フィールド)つき / test green / `npm run check` 全体 green / `npm run parts` に表示される / 新規外部依存ゼロ。
