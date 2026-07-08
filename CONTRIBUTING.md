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

## 新しい遊び（app）を足す — まず `npm run new`

いちばん速い足場作りは scaffolder に任せる。**約60秒**で「動く最小のおもちゃ」一式が出る:

```sh
npm run new -- my-toy
```

これで `apps/my-toy/` に6ファイル（`package.json` / `tsconfig.json` /
`src/index.ts` / `src/cli.ts` / `src/demo.ts` / `test/my-toy.test.ts`）が生成される。
生成直後から以下が全部通る状態で出る:

```sh
npm run check            # typecheck + テスト（緑）
npm run play my-toy      # 起動して見る（Ctrl+C で終了）
npm run gifs -- my-toy   # demo/gifs/my-toy.gif を生成
```

- 名前はケバブケース（小文字英数字とハイフン・数字/ハイフン始まり不可・連続ハイフン不可）。
  予約語 `random`（`npm run play random` と衝突）は弾かれる。
- 生成物の `index.ts`（純ロジック）/ `cli.ts`（実行）/ `demo.ts`（GIF デモ・決定論的）の
  三分割はそのまま「あるべき形」。ここを書き換えて育てる。
- core を使うときは `apps/my-toy/package.json` に `@umeplay/core-<domain>` 依存を足し、
  `import { ... } from "@umeplay/core-<domain>"` で1個以上組み合わせる。
  core をまたぐ再利用ロジックは app に書かず、core に落とす。
- 実行アプリとして root スクリプトから叩けるようにするなら、root `package.json` の `scripts` に
  `build:<name>` / `<name>` を追加（`esbuild` でバンドル → `node dist/<name>.mjs`。既存の
  `aquarium`/`symphony`/`loom` を参考に）。ライブ実行だけなら `npm run play <name>` で足りる。
- 最後に `README.md` / `README.ja.md` の「遊びカタログ（apps/）」表に1行追加。

### 手動で足す完全手順（scaffolder を使わない場合）

1. `apps/<name>/` を作る（`src/index.ts` に純ロジック、`package.json` に `@umeplay/*` 依存を宣言）
2. 使う core を `import { ... } from "@umeplay/core-<domain>"` で1個以上組み合わせる。
   core をまたぐ実装（app 固有の再利用ロジック）は書かない — core に落とす
3. **`src/demo.ts` を書く**（GIF 用デモ・決定論的）。規約は `packages/core-termgif/README.md` の
   「デモ規約（DemoSpec）」を参照。乱数は必ず `seeded()` で固定し、同じ入力から同じ GIF が出ること
4. **`src/cli.ts` を書く**（実行エントリ）。規約は `apps/event-loom/src/cli.ts` を参照:
   - `--frames N` でフレーム数指定 → キャプチャ用の有限終了
   - 指定なし → ライブ実行（`SIGINT`/`SIGTERM` でカーソル復帰して終了）
   - `index.ts` の純ロジックを import して呼ぶだけ。cli.ts 自体にロジックを書かない
5. 実行アプリ化する場合は root `package.json` の `scripts` に `build:<name>` / `<name>` を追加
   （`esbuild` でバンドル → `node dist/<name>.mjs`。既存の `aquarium`/`symphony`/`loom` を参考に）
6. 生成物確認: `npm run gifs -- <name>` で `demo/gifs/<name>.gif` が出ることを確認
7. `README.md` / `README.ja.md` の「遊びカタログ（apps/）」表に1行追加

## 新しい core を足す完全手順

1. `packages/core-<domain>/` を作る（`package.json` に `@umeplay/contracts` 依存を宣言・`src/index.ts`
   で公開 API を export）
2. 純ロジック（テスト対象）と副作用境界（DB/ファイル/外部プロセス呼び出し・テスト対象外）を
   別ファイルに分ける（既存 core 全てがこの分離を守っている）
3. **`tsconfig.base.json` の `paths` に1行追加**:
   ```json
   "@umeplay/core-<domain>": ["packages/core-<domain>/src/index.ts"]
   ```
4. **`vitest.config.ts` の `resolve.alias` に1行追加**（`tsconfig.base.json` と必ず一致させる）:
   ```ts
   "@umeplay/core-<domain>": resolve(root, "packages/core-<domain>/src/index.ts"),
   ```
5. `test/*.test.ts` で純ロジックを vitest unit テスト
6. `README.md`（本パッケージ用）を作成: 責務1文 / 提供API表 / 使用例 / 使っているapp / 設計原則
   （既存 core の README を参考にした形式）
7. root `README.md` の「部品カタログ（packages/）」表に1行追加

## PR 前チェック

```sh
npm run check   # tsc --noEmit + vitest run
npm run gifs    # demo.ts を持つ app 全部の GIF が壊れず生成できるか
```

両方が緑になってから PR を出す。`npm run gifs` は `demo.ts` が決定論的であることの検証も兼ねる
（`seeded()` を使わずに `Math.random()` を直接使っていると、実行ごとに GIF が変わり気づける）。

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
