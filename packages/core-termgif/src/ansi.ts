/**
 * ansi.ts — ANSI SGR 付きテキストフレームをセル格子に変換する。
 *
 * toygarden の app が吐く 16 色 SGR（0/1/2/22/30-37/39/90-97）を解釈する。
 * カーソル制御（2J/H/?25l 等）はフレーム単位描画では意味を持たないので読み飛ばす。
 */

export interface Cell {
  /** コードポイント（空白 = 0x20） */
  cp: number;
  /** 色番号: 0-7 = ANSI, -1 = デフォルト前景 */
  fg: number;
  bold: boolean;
  dim: boolean;
  /** 全角（2セル分の幅） */
  wide: boolean;
}

export interface Grid {
  cols: number;
  rows: number;
  /** rows × cols。wide セルの右半分は null。 */
  cells: (Cell | null)[][];
}

/** 全角判定（toygarden で使う範囲だけ: かな・CJK・全角形・記号の一部） */
export function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0x3000 && cp <= 0x303e) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) // 絵文字（フォント未収録なら塗りつぶし描画）
  );
}

interface Style {
  fg: number;
  bold: boolean;
  dim: boolean;
}

/** SGR パラメータ列を style に適用 */
function applySgr(style: Style, params: number[]): void {
  for (const p of params) {
    if (p === 0) {
      style.fg = -1;
      style.bold = false;
      style.dim = false;
    } else if (p === 1) style.bold = true;
    else if (p === 2) style.dim = true;
    else if (p === 22) {
      style.bold = false;
      style.dim = false;
    } else if (p >= 30 && p <= 37) style.fg = p - 30;
    else if (p === 39) style.fg = -1;
    else if (p >= 90 && p <= 97) {
      style.fg = p - 90;
      style.bold = true; // bright = bold 扱い（16色端末の慣習）
    }
    // 背景(40-49)・その他は現状の app が使わないので無視
  }
}

/** 1フレームのテキストをセル格子へ */
export function parseFrame(text: string, opts: { cols?: number; rows?: number } = {}): Grid {
  const style: Style = { fg: -1, bold: false, dim: false };
  const lines: (Cell | null)[][] = [[]];

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\x1b") {
      // CSI シーケンス: ESC [ params letter
      if (text[i + 1] === "[") {
        let j = i + 2;
        while (j < text.length && !/[a-zA-Z]/.test(text[j])) j++;
        const finalChar = text[j];
        if (finalChar === "m") {
          const body = text.slice(i + 2, j);
          const params = body.length === 0 ? [0] : body.split(";").map((s) => (s === "" ? 0 : Number(s)));
          applySgr(style, params);
        }
        // m 以外（J/H/l/h 等）は無視
        i = j + 1;
        continue;
      }
      i++;
      continue;
    }
    if (ch === "\n") {
      lines.push([]);
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    const cp = text.codePointAt(i) as number;
    const wide = isWide(cp);
    lines[lines.length - 1].push({ cp, fg: style.fg, bold: style.bold, dim: style.dim, wide });
    if (wide) lines[lines.length - 1].push(null); // 右半分
    i += cp > 0xffff ? 2 : 1;
  }

  // 末尾の空行を落とす
  while (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();

  const cols = opts.cols ?? Math.max(1, ...lines.map((l) => l.length));
  const rows = opts.rows ?? lines.length;
  const cells: (Cell | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const src = lines[r] ?? [];
    const row: (Cell | null)[] = [];
    for (let c = 0; c < cols; c++) {
      // null は wide セルの右半分なのでそのまま保持（?? だと空白化して潰れる）
      const cell = src[c];
      row.push(cell === undefined ? { cp: 0x20, fg: -1, bold: false, dim: false, wide: false } : cell);
    }
    cells.push(row);
  }
  return { cols, rows, cells };
}
