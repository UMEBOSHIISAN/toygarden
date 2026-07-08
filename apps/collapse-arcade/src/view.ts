/**
 * view.ts — collapse-arcade の画面描画（純関数・乱数なし）。demo.ts と cli.ts で共有する。
 * 文字は ASCII + ひらがな + 罫線/ブロック/指定記号のみ（core-termgif のフォント収録範囲に合わせる）。
 */
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

export const HEADER = `  ${CYAN}~ collapse-arcade ~${RESET}  ${DIM}たかい くずれりつ を うちおとす${RESET}`;

const COL_W = 13;
const col = (s: string): string => (s.length >= COL_W ? s.slice(0, COL_W) : s.padEnd(COL_W, " "));

function bar(hp: number, maxHp: number, width = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round((Math.max(hp, 0) / maxHp) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** 画面表示用の敵ビュー（index.ts の Enemy に maxHp を添えたもの）。 */
export interface EnemyView {
  agent: string;
  hp: number;
  maxHp: number;
}

export type Phase = "idle" | "rise" | "hit" | "settle";

/** 敵編隊 + カノン + score を1画面に描く。 */
export function renderBattle(rows: EnemyView[], targetIdx: number, phase: Phase, score: number): string {
  const nameCells: string[] = [];
  const spriteCells: string[] = [];
  const barCells: string[] = [];
  const hpCells: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const alive = r.hp > 0;
    const isTarget = i === targetIdx;
    const hitNow = phase === "hit" && isTarget;
    const diedNow = hitNow && !alive;

    const nameColor = !alive ? DIM : hitNow ? YELLOW + BOLD : RED;
    nameCells.push(nameColor + col(r.agent) + RESET);

    let sprite: string;
    let spriteColor: string;
    if (diedNow) {
      sprite = "  ▓▓▓  ";
      spriteColor = YELLOW + BOLD;
    } else if (!alive) {
      sprite = "   ○   ";
      spriteColor = DIM + GREEN;
    } else if (hitNow) {
      sprite = "   ◆   ";
      spriteColor = YELLOW + BOLD;
    } else {
      sprite = "   ◆   ";
      spriteColor = RED;
    }
    spriteCells.push(spriteColor + col(sprite) + RESET);

    const barColor = !alive ? DIM : hitNow ? YELLOW : GREEN;
    barCells.push(barColor + col(alive ? bar(r.hp, r.maxHp) : "  たおした") + RESET);
    hpCells.push(DIM + col(alive ? `${Math.max(r.hp, 0)}/${r.maxHp}` : "  --/--") + RESET);
  }

  const cannonRow = rows
    .map((_, i) => col(i === targetIdx && (phase === "rise" || phase === "hit") ? "   ▲   " : "       "))
    .join(" ");
  const bulletRow = rows.map((_, i) => col(i === targetIdx && phase === "rise" ? "   |   " : "       ")).join(" ");

  const lines = [
    HEADER,
    "",
    spriteCells.join(" "),
    barCells.join(" "),
    hpCells.join(" "),
    nameCells.join(" "),
    "",
    bulletRow,
    CYAN + cannonRow + RESET,
    DIM + "─".repeat(56) + RESET,
    "",
    `  ${BOLD}score: ${score}${RESET}`,
  ];
  return lines.join("\n");
}

/** 全滅後のクリア画面。 */
export function renderClear(score: number, defeated: number): string {
  const lines = [
    HEADER,
    "",
    "",
    `        ${YELLOW}${BOLD}★★★ ぜんめつ !! ★★★${RESET}`,
    "",
    `        ${GREEN}score: ${score}${RESET}`,
    "",
    `        ${DIM}defeated: ${defeated}${RESET}`,
    "",
    DIM + "─".repeat(56) + RESET,
    "",
    `  ${DIM}おつかれさま${RESET}`,
  ];
  return lines.join("\n");
}
