# @umeplay/core-termgif

ターミナル出力（ANSI フレーム列）を **GIF に焼く**部品。依存ゼロ。

READMEに貼るデモGIFを「スクリーン録画」ではなく**コードから決定論的に再現**するために生まれた。
同じ demo → 同じ GIF。デモが腐らない。

## 内蔵しているもの

| 部品 | 中身 |
|---|---|
| GIF89a エンコーダ | LZW 圧縮・アニメーション・無限ループ。仕様から手書き |
| ANSI パーサ | 16色 SGR（`0/1/2/22/30-37/39/90-97`）をセル格子へ |
| 8x8 ビットマップフォント | [dhepper/font8x8](https://github.com/dhepper/font8x8)（Public Domain・IBM VGA由来）+ 手描き記号。ASCII / Latin-1 / 罫線 / ブロック / ギリシャ / **ひらがな** 510 グリフ |

カタカナはひらがなグリフで音写（テ→て）。漢字・絵文字は塗りつぶしブロックで代替
（=絵は壊れない）。デモの文字は ASCII + かな推奨。

## 使い方

```ts
import { renderGif, seeded, type DemoSpec } from "@umeplay/core-termgif";
import { writeFileSync } from "node:fs";

const frames = ["hello\nworld", "\x1b[36mhello\x1b[0m\nworld!"];
writeFileSync("out.gif", renderGif(frames, { fps: 4 }));
```

## デモ規約（DemoSpec）

各 app は `src/demo.ts` で以下を export する。`tools/gifcast.ts` が拾って `demo/gifs/<name>.gif` を量産する。

```ts
import type { DemoSpec } from "@umeplay/core-termgif";
import { seeded } from "@umeplay/core-termgif";

export function demo(): DemoSpec {
  const rnd = seeded(42); // 乱数は必ず seeded（同じ入力 → 同じ GIF）
  return { name: "my-app", fps: 5, frames: [...], uses: ["core-tui"], tagline: "1行の売り文句" };
}
```

## 精度の根拠

- LZW は独立実装のデコーダで roundtrip テスト（ランダム列・ベタ塗り・4096辞書リセット跨ぎ）
- フォントは bake スクリプト（`tools/bake_font.mjs`）で出自ごと焼き込み・目視検証済み
