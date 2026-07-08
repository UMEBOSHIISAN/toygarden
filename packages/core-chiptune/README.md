# @umeplay/core-chiptune

イベントを **8bit チップチューン**（矩形波 PCM / WAV）に変換して鳴らす部品。依存は
`@umeplay/contracts` のみ。音名→周波数、イベント種別→モチーフ、モチーフ→PCM/WAV、
再生（macOS `afplay`）まで一気通貫。

純ロジック（`notes.ts` / `motif.ts` / `synth.ts`）と副作用境界（`play.ts`）を分離しているので、
音を鳴らさずに WAV バイト列だけを検証できる。

## 提供 API

`src/index.ts` が export する全体。

| API | 種別 | シグネチャ |
|---|---|---|
| `noteToFreq` | 関数 | `noteToFreq(note: string): number`（例: `"C4"` → 261.6…。A4=440基準・12平均律） |
| `MOTIFS` | 定数 | `{ gatePending, collapse, deploySuccess }`（イベント種別ごとの既定モチーフ） |
| `motifForEvent` | 関数 | `motifForEvent(e: PlayEvent): Motif \| null`（対象外イベントは `null`） |
| `Motif` / `Note` | type | `Motif = { notes: Note[] }`、`Note = { note: string; ms: number }` |
| `renderPCM` | 関数 | `renderPCM(motif: Motif, sampleRate?: number): Int16Array`（純関数・矩形波合成） |
| `encodeWav` | 関数 | `encodeWav(pcm: Int16Array, sampleRate?: number): Uint8Array`（純関数・WAVヘッダ付与） |
| `play` | 関数 | `play(motif: Motif): void`（副作用・macOS `afplay` で実再生。テスト対象外） |

## 使用例

```ts
import { motifForEvent, renderPCM, encodeWav, play } from "@umeplay/core-chiptune";
import type { PlayEvent } from "@umeplay/contracts";

const e: PlayEvent = { kind: "deploy.success" };
const motif = motifForEvent(e); // ファンファーレのモチーフ

if (motif) {
  play(motif); // その場で鳴らす（macOS）

  // もしくは WAV バイト列として保存
  const wav = encodeWav(renderPCM(motif));
  // writeFileSync("deploy.wav", wav);
}
```

`commit-symphony` は `renderPCM` / `encodeWav` を直接使い、自前のモチーフ生成ロジック
（git 履歴 → `Motif`）を組み合わせている。既存モチーフに縛られず、任意の `Motif` を作って鳴らせる。

## 使っている app

`chiptune-clock` / `chiptune-themes` / `collapse-siren` / `commit-symphony` / `focus-forge` /
`pomodoro-forge` が `@umeplay/core-chiptune` を直接 import する（`apps/*/src/*.ts` を grep して実測）。

## 設計原則

- **純ロジックと副作用境界の分離**: `renderPCM` / `encodeWav` はテスト可能な純関数。`play` だけが
  実 OS（`afplay`）に依存し、テスト対象外として明確に分離されている。
- **出力デバイス非依存**: PCM/WAV 生成は再生方法を一切知らない。将来 Web Audio や実機スピーカーに
  差し替えても `renderPCM`/`encodeWav` は無改修で使える。
- **イベント→音の写像はここに閉じる**: `motifForEvent` の switch がイベント種別と音の対応表。
  新しいイベントに音を付けたければここに `case` を足すか、app 側で独自マッピングを組む。
