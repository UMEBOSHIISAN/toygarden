# @toygarden/core-git-observe

git リポジトリの活動量を **read-only で観測**する部品。`git log --numstat` を叩き、
コミットごとの追加/削除行数と `Co-Authored-By: Claude` の有無を構造化する。依存は
`@toygarden/contracts` のみ（外部 npm 不要 — git CLI を `child_process` で直接呼ぶ）。

純ロジック（文字列パース）と副作用（git 実行）を明確に分離している: `parse.ts` はテスト可能な
純関数、`observer.ts` が実 git を呼ぶ薄い adapter。

## 提供 API

`src/index.ts` が export する全体。

| API | 種別 | シグネチャ |
|---|---|---|
| `GitCommit` | type | `{ hash; author; added; removed; coauthoredByClaude }` |
| `GIT_LOG_FORMAT` | 定数 | `commitsSince` が使う `git log --format` 文字列 |
| `parseGitLog` | 関数 | `parseGitLog(raw: string): GitCommit[]`（純関数・`--numstat --format=GIT_LOG_FORMAT` 出力をパース） |
| `commitsSince` | 関数 | `commitsSince(dir: string, count?: number): GitCommit[]`（既定 `count=20`。実 git 実行） |
| `toPlayEvents` | 関数 | `toPlayEvents(commits: GitCommit[]): PlayEvent[]`（`git.commit` イベントへ変換） |

## 使用例

```ts
import { commitsSince, toPlayEvents } from "@toygarden/core-git-observe";

const commits = commitsSince(process.cwd(), 10); // 直近10コミット
console.log(commits[0]);
// { hash: "...", author: "umeboshi", added: 42, removed: 3, coauthoredByClaude: true }

const events = toPlayEvents(commits); // PlayEvent[]（EventBus.emit にそのまま渡せる）
```

`commitsToMotif`（`commit-symphony`）のように、`GitCommit[]` をそのまま別 core（`core-chiptune` 等）の
入力に使う「掛け合わせ」が toygarden の基本パターン。

## 使っている app

`commit-constellation` / `commit-symphony` / `git-replay` / `git-weather` が
`@toygarden/core-git-observe` を直接 import する（`apps/*/src/*.ts` を grep して実測）。

## 設計原則

- **read-only**: git リポジトリを一切 mutate しない。`git log` を読むだけ。
- **純ロジックと副作用の分離**: `parseGitLog`（純関数・テスト対象）と `commitsSince`（実行・テスト対象外）
  を別ファイルに分ける。テストは常に `parseGitLog` を狙う。
- **外部 npm 依存ゼロ**: git CLI を `node:child_process` で直接呼ぶ。パーサも自前実装。
