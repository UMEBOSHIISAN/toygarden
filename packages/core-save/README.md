# @umeplay/core-save

A fail-soft, zero-dependency JSON persistence layer for small states in `~/.umeplay`.
Dependency: `@umeplay/contracts` only.

`[ core-save ] :: keep your toy's memory safe`

## Provided API

The full public surface exported by `src/index.ts` (implementation lives in `src/save.ts`).

| API | Kind | Signature |
|---|---|---|
| `SaveOptions` | type | `{ dir?: string }`（テスト用注入。未指定時は `~/.umeplay/`） |
| `SaveResult<T>` | type | `{ ok: true; data: T } \| { ok: false; reason: "EMPTY" \| "CORRUPTED" }` |
| `parseSave` | function | `<T>(json: string, fallback: T): T`（純ロジック。壊れた JSON は例外を投げず fallback） |
| `applyUpdate` | function | `<T>(current: T, updater: (draft: T) => void): T`（純ロジック。ディープコピー→更新→返却） |
| `resolveSavePath` | function | `(name: string, options?: SaveOptions): string`（純ロジック。テスト容易性のため path 計算を分離） |
| `loadSave` | function | `<T>(name: string, fallback: T, options?: SaveOptions): Promise<SaveResult<T>>`（副作用境界） |
| `saveSave` | function | `<T>(name: string, data: T, options?: SaveOptions): Promise<void>`（副作用境界。fail-soft） |

## Usage

```ts
import { loadSave, saveSave, applyUpdate } from "@umeplay/core-save";

const fallback = { best: 0 };
const result = await loadSave("cpu-diner", fallback);
let state = result.ok ? result.data : fallback;

state = applyUpdate(state, (d) => {
  d.best = Math.max(d.best, 42);
});

await saveSave("cpu-diner", state); // 失敗しても投げない
```

## Design principles

- **Side effect boundary**: `loadSave` / `saveSave` are the only functions that touch the filesystem.
  `parseSave` / `applyUpdate` / `resolveSavePath` are pure and fully unit-tested.
- **Missing file is not an error**: a first run has no save file yet, so `loadSave` treats `ENOENT` as
  the expected case and returns `{ ok: true, data: fallback }` rather than an error state.
  `{ ok: false, reason: "EMPTY" | "CORRUPTED" }` is reserved for a file that exists but is unusable
  (empty content / malformed JSON) — the caller already holds its own `fallback` and can fall back to
  it itself in that branch.
- **Zero dependency**: no Immer. `applyUpdate` uses `structuredClone` for the copy-then-mutate pattern.
- **Fail-soft writes**: `saveSave` never throws. Disk-full / permission errors are caught and only
  logged with `console.warn` — a toy (Toys) must never crash because a save failed.

## Deviation from the design brief

The design brief did not list a `resolveSavePath` export, but its own "実装上の罠" note recommended
extracting path resolution into "a pure function, for testability" (test case 4). This package follows
that recommendation and exports it, since `loadSave`/`saveSave` both need the exact same resolution
logic and duplicating it inline would defeat the point of the recommendation.
