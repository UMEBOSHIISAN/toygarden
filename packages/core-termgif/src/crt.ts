/**
 * crt.ts — レトロ CRT 風の後処理フィルタ（cool-retro-term の質感を自前実装で吸収）。
 *
 * renderGif() が作る「パレット index 画像」に対して、走査線・グロー(滲み)・
 * ビネット(四隅減光) を適用する純関数群。GIF は 256 色上限なので、効果適用後に
 * 増える色は quantizeShared() が動的に量子化して 1 本の共有パレットへ畳み込む。
 * 依存ゼロ・決定論的（同じ入力 → 同じ出力）。
 */
import type { Palette, GifFrame } from "./gif.ts";

export interface CrtOptions {
  /** 走査線: 偶数行をこの割合だけ暗くする。0=無効 (既定 0.25) */
  scanlineDarken?: number;
  /** グロー: 明るいピクセルが上下左右に滲む強さ。0=無効 (既定 0.35) */
  glowStrength?: number;
  /** グローが「明るい」とみなす輝度しきい値 0-255 (既定 96) */
  glowThreshold?: number;
  /** ビネット: 四隅の減光の強さ。0=無効 (既定 0.3) */
  vignetteStrength?: number;
  /** 出力パレットの最大色数。GIF 上限 256 を超えて指定しても 256 に丸める (既定 256) */
  maxColors?: number;
}

/** width*height の連続 RGB バッファ（1 ピクセル = 3 要素、0-255 範囲外もクランプ前は許容） */
interface RgbImage {
  width: number;
  height: number;
  data: Float32Array;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** パレット index 画像 → 連続 RGB バッファ */
function decodeIndices(width: number, height: number, palette: Palette, indices: Uint8Array): RgbImage {
  const data = new Float32Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    const [r, g, b] = palette[indices[p]] ?? [0, 0, 0];
    data[p * 3] = r;
    data[p * 3 + 1] = g;
    data[p * 3 + 2] = b;
  }
  return { width, height, data };
}

/**
 * グロー: 輝度がしきい値を超えるピクセルの色を上下左右の隣接ピクセルへ滲ませる。
 * 一方向のみ（暗い方を明るい方へ寄せる）。既に隣接ピクセルの方が明るければ変えない。
 */
function applyGlow(img: RgbImage, strength: number, threshold: number): RgbImage {
  const { width, height, data } = img;
  const out = Float32Array.from(data);
  if (strength <= 0) return { width, height, data: out };
  const offsets: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 3;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      if (luminance(r, g, b) < threshold) continue;
      for (const [dx, dy] of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = (ny * width + nx) * 3;
        out[ni] = Math.max(out[ni], out[ni] + (r - out[ni]) * strength);
        out[ni + 1] = Math.max(out[ni + 1], out[ni + 1] + (g - out[ni + 1]) * strength);
        out[ni + 2] = Math.max(out[ni + 2], out[ni + 2] + (b - out[ni + 2]) * strength);
      }
    }
  }
  return { width, height, data: out };
}

/** 走査線: 偶数行（生ピクセル行）を一律に暗くする */
function applyScanlines(img: RgbImage, darken: number): RgbImage {
  const { width, height, data } = img;
  const out = Float32Array.from(data);
  if (darken <= 0) return { width, height, data: out };
  const factor = 1 - darken;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      out[i] *= factor;
      out[i + 1] *= factor;
      out[i + 2] *= factor;
    }
  }
  return { width, height, data: out };
}

/** ビネット: 中心からの正規化距離の2乗に比例して四隅を暗くする */
function applyVignette(img: RgbImage, strength: number): RgbImage {
  const { width, height, data } = img;
  const out = Float32Array.from(data);
  if (strength <= 0) return { width, height, data: out };
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxDist;
      const dy = (y - cy) / maxDist;
      const dist2 = Math.min(1, dx * dx + dy * dy);
      const factor = 1 - strength * dist2;
      const i = (y * width + x) * 3;
      out[i] *= factor;
      out[i + 1] *= factor;
      out[i + 2] *= factor;
    }
  }
  return { width, height, data: out };
}

/**
 * 1 フレーム分の CRT 効果を適用（純関数）。適用順: グロー → 走査線 → ビネット
 * （滲みは蛍光体側の性質、走査線とビネットは管面側のマスクという想定）。
 */
export function applyCrt(
  width: number,
  height: number,
  palette: Palette,
  indices: Uint8Array,
  opts: CrtOptions = {},
): RgbImage {
  const scanlineDarken = opts.scanlineDarken ?? 0.25;
  const glowStrength = opts.glowStrength ?? 0.35;
  const glowThreshold = opts.glowThreshold ?? 96;
  const vignetteStrength = opts.vignetteStrength ?? 0.3;

  let img = decodeIndices(width, height, palette, indices);
  img = applyGlow(img, glowStrength, glowThreshold);
  img = applyScanlines(img, scanlineDarken);
  img = applyVignette(img, vignetteStrength);
  return img;
}

function quantizeChannel(v: number, step: number): number {
  const q = Math.round(v / step) * step;
  return Math.max(0, Math.min(255, Math.round(q)));
}

// 量子化バケット幅の候補（小さい順）。1 なら無劣化（丸めのみ）。
// GIF の256色上限に収まらない場合、順に粗くしながら色数を減らす。
// 256 では最大 2^3=8 通りまで潰れるため必ずどこかで maxColors 以下になる。
const QUANTIZE_STEPS: ReadonlyArray<number> = [1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256];

/**
 * 複数フレームをまたいで「1本の共有パレット」に量子化する（GIF は1画像=1グローバルパレット）。
 * 色数が maxColors を超えたら量子化ステップを粗くしながら再試行する。
 */
export function quantizeShared(
  images: ReadonlyArray<RgbImage>,
  maxColors = 256,
): { palette: Palette; indexed: Uint8Array[] } {
  const cap = Math.max(1, Math.min(256, maxColors));

  for (const step of QUANTIZE_STEPS) {
    const colorOf = new Map<string, readonly [number, number, number]>();
    for (const img of images) {
      const n = img.width * img.height;
      for (let p = 0; p < n; p++) {
        const r = quantizeChannel(img.data[p * 3], step);
        const g = quantizeChannel(img.data[p * 3 + 1], step);
        const b = quantizeChannel(img.data[p * 3 + 2], step);
        const key = `${r},${g},${b}`;
        if (!colorOf.has(key)) colorOf.set(key, [r, g, b]);
      }
    }
    if (colorOf.size > cap) continue;

    const sortedKeys = [...colorOf.keys()].sort();
    const palette: Array<readonly [number, number, number]> = sortedKeys.map((k) => colorOf.get(k)!);
    const indexOf = new Map(sortedKeys.map((k, i) => [k, i]));

    const indexed = images.map((img) => {
      const n = img.width * img.height;
      const out = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        const r = quantizeChannel(img.data[p * 3], step);
        const g = quantizeChannel(img.data[p * 3 + 1], step);
        const b = quantizeChannel(img.data[p * 3 + 2], step);
        out[p] = indexOf.get(`${r},${g},${b}`)!;
      }
      return out;
    });
    return { palette, indexed };
  }
  // QUANTIZE_STEPS は 256 まで含むため理論上ここには到達しない。
  throw new Error("quantizeShared: 量子化に失敗（到達しないはずの経路）");
}

/**
 * renderGif() 相当の中間表現（width/height/palette/GifFrame[]）へ CRT 効果を適用し、
 * 全フレーム共有の新しいパレットと index 列を返す。delayCs はフレームごとに保持する。
 */
export function renderCrtFrames(
  width: number,
  height: number,
  palette: Palette,
  frames: ReadonlyArray<GifFrame>,
  opts: CrtOptions = {},
): { palette: Palette; frames: GifFrame[] } {
  const images = frames.map((f) => applyCrt(width, height, palette, f.indices, opts));
  const { palette: outPalette, indexed } = quantizeShared(images, opts.maxColors ?? 256);
  const outFrames: GifFrame[] = frames.map((f, i) => ({ indices: indexed[i], delayCs: f.delayCs }));
  return { palette: outPalette, frames: outFrames };
}
