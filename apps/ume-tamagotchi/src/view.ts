/**
 * view.ts — ume-tamagotchi の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * 文字は ASCII + ひらがな + 罫線/ブロック/指定記号のみ（face() が返す顔文字はロジック実物なのでそのまま表示する）。
 */
import type { Pet } from "./index.ts";
import { face } from "./index.ts";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const MAGENTA = "\x1b[35m";

export const HEADER = `  ${CYAN}~ ume-tamagotchi ~${RESET}  ${DIM}posts make her happy, silence makes her sulk${RESET}`;

function gauge(value: number, color: string): string {
  const filled = Math.max(0, Math.min(20, Math.round((value / 100) * 20)));
  return color + "█".repeat(filled) + DIM + "░".repeat(20 - filled) + RESET;
}

function faceColor(pet: Pet): string {
  if (pet.energy < 20) return RED;
  if (pet.mood > 70) return YELLOW + BOLD;
  if (pet.mood < 30) return DIM;
  return GREEN;
}

/** 現在の Pet 状態 + 直近イベントの一言キャプションを1画面に描く。 */
export function renderPet(pet: Pet, caption: string): string {
  const f = face(pet); // 実際の face() をそのまま表示（顔文字はロジック実物）
  const lines = [
    HEADER,
    "",
    `        ${faceColor(pet)}${BOLD}${f}${RESET}`,
    "",
    `        ${pet.name}`,
    "",
    `  mood   ${gauge(pet.mood, MAGENTA)} ${String(pet.mood).padStart(3)}`,
    `  energy ${gauge(pet.energy, CYAN)} ${String(pet.energy).padStart(3)}`,
    "",
    `  ${DIM}${caption}${RESET}`,
  ];
  return lines.join("\n");
}
