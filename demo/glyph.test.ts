import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it, expect } from "vitest";
import { hasGlyph, parseFrame, type DemoSpec } from "@umeplay/core-termgif";

/**
 * 全 app の demo() が実際に GIF へ描く文字は、core-termgif のフォント(font8x8)で
 * 「塗りつぶしブロック」に化けずに描画できることを保証するリントテスト。
 *
 * hasGlyph() をそのまま使うと以下 2 パターンで誤検出する（実測で確認済み）ため、
 * font.ts の glyph() が持つ 2 つの明示的フォールバックをそのまま反映する:
 *   - 全角スペース(U+3000)はテーブルに直接のエントリが無く hasGlyph=false だが、
 *     glyph() は空白として明示的に扱う（塗りつぶしブロックにはならない）。
 *   - カタカナ(U+30A1-30F6)もテーブルに無く hasGlyph=false だが、glyph() は
 *     ひらがなへの音写フォールバックを持つ（font.ts 参照。「テ→て」で読める）。
 *     21 app 中 21 app すべてが demo でカタカナを使っており、hasGlyph 単体判定では
 *     全 app が誤って FAIL する。
 * 逆に「glyph() の実バイト列が塗りつぶしブロックと一致するか」で判定する方式も試したが、
 * 塗りつぶしブロックは既存グリフ(黒丸 ● U+25CF)のビットマップを再利用しているため、
 * demo が意図的に ● を描画している app (focus-aquarium 等) を誤検出することが実測で判明した。
 * そのため判定は「収録テーブルに実在するか」を正とし、上記 2 例外だけを個別に許可する。
 */

const appsDir = join(process.cwd(), "apps");
const appNames = readdirSync(appsDir).filter((name) =>
  existsSync(join(appsDir, name, "src", "demo.ts")),
);

const KATAKANA_MIN = 0x30a1;
const KATAKANA_MAX = 0x30f6;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

/** font.ts の glyph() と同じフォールバック規則で「塗りつぶしブロックに化けないか」を判定する。 */
function isRenderable(cp: number): boolean {
  if (cp === 0x20 || cp === 0x3000) return true;
  if (hasGlyph(cp)) return true;
  if (cp >= KATAKANA_MIN && cp <= KATAKANA_MAX) return hasGlyph(cp - KATAKANA_TO_HIRAGANA_OFFSET);
  return false;
}

/** 1 app の全フレームから、実際にセルとして描画されるコードポイントを収集する。 */
function collectCodepoints(frames: readonly string[]): Set<number> {
  const cps = new Set<number>();
  for (const frame of frames) {
    const grid = parseFrame(frame);
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell) cps.add(cell.cp);
      }
    }
  }
  return cps;
}

function codepointLabel(cp: number): string {
  const hex = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
  try {
    return `'${String.fromCodePoint(cp)}' (${hex})`;
  } catch {
    return `(${hex})`;
  }
}

describe("glyph coverage: demo() が描く文字は core-termgif のフォントに収録されている", () => {
  for (const appName of appNames) {
    it(appName, async () => {
      const entry = join(appsDir, appName, "src", "demo.ts");
      const mod = (await import(pathToFileURL(entry).href)) as { demo?: () => DemoSpec };
      expect(typeof mod.demo, `${appName}: demo() が export されていない`).toBe("function");

      const spec = mod.demo!();
      expect(spec.frames?.length, `${appName}: frames が空`).toBeGreaterThan(0);

      const broken = [...collectCodepoints(spec.frames)]
        .filter((cp) => !isRenderable(cp))
        .map(codepointLabel);

      expect(
        broken,
        `${appName} の demo() が font8x8 未収録の文字を描画している(GIF上で ● に化ける): ${broken.join(", ")}`,
      ).toEqual([]);
    });
  }
});
