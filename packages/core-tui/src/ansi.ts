// 最小 ANSI（依存ゼロ）。実端末描画は app 側、ここは文字列生成の純ロジック。
const ESC = String.fromCharCode(27);
export const RED = `${ESC}[31m`;
export const GREEN = `${ESC}[32m`;
export const YELLOW = `${ESC}[33m`;
export const DIM = `${ESC}[2m`;
export const RESET = `${ESC}[0m`;

export function color(code: string, s: string): string {
  return `${code}${s}${RESET}`;
}
