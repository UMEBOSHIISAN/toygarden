/**
 * @umeplay/core-termgif — ターミナル出力（ANSI フレーム列）を GIF に焼く部品。
 *
 * これ1つで「app のデモ → README に貼れる GIF」がリポジトリ内で再現できる。
 * 依存ゼロ: GIF89a エンコーダ / LZW / ANSI パーサ / 8x8 ビットマップフォントを内蔵。
 *
 * 使い方:
 *   const gif = renderGif(frames, { fps: 5 });      // frames: 画面全体の文字列の配列
 *   writeFileSync("demo/gifs/foo.gif", gif);
 *
 * デモ規約（DemoSpec）: 各 app は src/demo.ts で demo(): DemoSpec を export する。
 * 乱数は seeded() を使い決定論的に（同じ入力 → 同じ GIF）。
 */
import { encodeGif, type GifFrame, type Palette } from "./gif.ts";
import { parseFrame } from "./ansi.ts";
import { glyph } from "./font.ts";

export { lzwEncode, encodeGif, type Palette, type GifFrame } from "./gif.ts";
export { parseFrame, isWide, type Cell, type Grid } from "./ansi.ts";
export { glyph, hasGlyph } from "./font.ts";

/** app が demo.ts で export する規約。frames は「画面全体」を表す文字列（ANSI 可・\n 区切り）。 */
export interface DemoSpec {
  /** GIF ファイル名にもなる識別子（例: "focus-forge"） */
  name: string;
  /** 1秒あたりフレーム数 */
  fps: number;
  frames: string[];
  /** 描画に使った core の組み合わせ（showcase 表示用） */
  uses?: string[];
  /** 1行の売り文句（showcase 表示用） */
  tagline?: string;
}

/** 決定論的乱数（mulberry32）。demo はこれで作る＝再現可能な GIF。 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ダーク端末風パレット。index 順: bg, defaultFg, ANSI8 通常, ANSI8 明(bold), ANSI8 暗(dim), defaultFg の明/暗
const BG: readonly [number, number, number] = [13, 17, 23];
const FG: readonly [number, number, number] = [230, 237, 243];
const NORMAL: ReadonlyArray<readonly [number, number, number]> = [
  [72, 79, 88], // black
  [255, 123, 114], // red
  [63, 185, 80], // green
  [210, 153, 34], // yellow
  [88, 166, 255], // blue
  [188, 140, 242], // magenta
  [57, 197, 207], // cyan
  [177, 186, 196], // white
];

function scale(c: readonly [number, number, number], f: number): [number, number, number] {
  return [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
}

function buildPalette(): Palette {
  const p: Array<readonly [number, number, number]> = [BG, FG];
  for (const c of NORMAL) p.push(c); // 2..9 通常
  for (const c of NORMAL) p.push(scale(c, 1.25).map((v) => Math.min(255, v)) as [number, number, number]); // 10..17 bold
  for (const c of NORMAL) p.push(scale(c, 0.55)); // 18..25 dim
  p.push(scale(FG, 1.05).map((v) => Math.min(255, v)) as [number, number, number]); // 26 fg bold
  p.push(scale(FG, 0.55)); // 27 fg dim
  return p;
}

const PALETTE = buildPalette();

/** セルの色 → パレット index */
function colorIndex(fg: number, bold: boolean, dim: boolean): number {
  if (fg < 0) return dim ? 27 : bold ? 26 : 1;
  if (dim) return 18 + fg;
  if (bold) return 10 + fg;
  return 2 + fg;
}

export interface RenderOptions {
  /** フレーム毎秒（既定 5） */
  fps?: number;
  /** ピクセル拡大率（既定 2 → 1セル 16x16px） */
  pxScale?: number;
  /** 列数を固定（既定: 全フレーム中の最大幅） */
  cols?: number;
  /** 行数を固定（既定: 全フレーム中の最大高さ） */
  rows?: number;
}

/**
 * ANSI フレーム列 → アニメーション GIF バイト列。
 * 全フレームを同一サイズの格子に正規化してから描く（サイズ揺れで壊れない）。
 */
export function renderGif(frames: ReadonlyArray<string>, opts: RenderOptions = {}): Uint8Array {
  if (frames.length === 0) throw new Error("renderGif: frames が空");
  const fps = opts.fps ?? 5;
  const px = opts.pxScale ?? 2;

  const parsed = frames.map((f) => parseFrame(f));
  const cols = opts.cols ?? Math.max(...parsed.map((g) => g.cols));
  const rows = opts.rows ?? Math.max(...parsed.map((g) => g.rows));
  const normalized = frames.map((f) => parseFrame(f, { cols, rows }));

  const width = cols * 8 * px;
  const height = rows * 8 * px;
  const delayCs = Math.max(2, Math.round(100 / fps));

  const gifFrames: GifFrame[] = normalized.map((grid) => {
    const indices = new Uint8Array(width * height); // 0 = bg
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid.cells[r][c];
        if (!cell || cell.cp === 0x20) continue;
        const g = glyph(cell.cp);
        const color = colorIndex(cell.fg, cell.bold, cell.dim);
        const cellW = cell.wide ? 2 : 1; // 全角は2セルへ横伸ばし
        for (let gy = 0; gy < 8; gy++) {
          const bits = g[gy];
          if (bits === 0) continue;
          for (let gx = 0; gx < 8; gx++) {
            if (!(bits & (1 << gx))) continue;
            // フォントピクセル → 実ピクセル（横は wide で2倍）
            const x0 = (c * 8 + gx * cellW) * px;
            const y0 = (r * 8 + gy) * px;
            for (let dy = 0; dy < px; dy++) {
              const rowOff = (y0 + dy) * width;
              for (let dx = 0; dx < px * cellW; dx++) {
                indices[rowOff + x0 + dx] = color;
              }
            }
          }
        }
      }
    }
    return { indices, delayCs };
  });

  return encodeGif(width, height, PALETTE, gifFrames);
}
