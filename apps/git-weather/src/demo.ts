/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 直近コミットの churn（追加+削除）が積もるほど天気が荒れる様子を見せる。
 * `npm run gifs` が拾って demo/gifs/git-weather.gif を再生成する。
 */
import { seeded, type DemoSpec } from "@toygarden/core-termgif";
import type { GitCommit } from "@toygarden/core-git-observe";
import { repoWeather, type Weather } from "./index.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BLUE = "\x1b[34m";
const RED = "\x1b[31m";
const WHITE = "\x1b[37m";
const GREEN = "\x1b[32m";

const ICON: Record<Weather, readonly string[]> = {
  sunny: ["   \\ | /   ", "  --(○)--  ", "   / | \\   "],
  cloudy: ["   .----.   ", " (        ) ", "(__________)"],
  rain: ["(__________)", " '  '  '  ' ", "  '  '  '   "],
  storm: ["(__________)", "   \\    /   ", "    \\  / ★  "],
};

const COLOR: Record<Weather, string> = { sunny: YELLOW, cloudy: WHITE, rain: BLUE, storm: RED };
const LABEL: Record<Weather, string> = { sunny: "sunny", cloudy: "cloudy", rain: "rain", storm: "storm" };

const WINDOW = 6; // 直近何件で天気を判定するか（実運用の "直近コミット" に相当）

function bar(n: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((n / max) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function renderScreen(recent: GitCommit[], repoLabel: string, tick: number): string {
  const w = repoWeather(recent);
  const c = COLOR[w];
  const flicker = w === "storm" && tick % 2 === 0;
  const churn = recent.reduce((s, cm) => s + cm.added + cm.removed, 0);
  const header = `  ${CYAN}~ git-weather ~${RESET}  ${DIM}${repoLabel}'s weather (last ${recent.length} commits)${RESET}`;
  const icon = ICON[w].map((l) => c + (flicker ? l.replace("★", " ") : l) + RESET).join("\n");
  const label = `      ${BOLD}${c}${LABEL[w]}${RESET}  ${DIM}churn:${churn}${RESET}`;
  const gauge = `  churn  ${bar(churn, 400, 20)} ${String(churn).padStart(4)}`;
  const ticker = recent
    .slice(-4)
    .map((cm) => `  ${GREEN}+${cm.added}${RESET} ${RED}-${cm.removed}${RESET}  ${DIM}${cm.hash}${RESET}`)
    .join("\n");
  return `${header}\n\n${icon}\n${label}\n\n${gauge}\n\n${ticker}`;
}

/** 静かな時期 → 荒れる時期 → また静かに、を模した合成コミット列。 */
function commitAt(i: number, rnd: () => number): GitCommit {
  let lo = 1;
  let hi = 8;
  if (i >= 7 && i < 14) {
    lo = 15;
    hi = 60;
  } else if (i >= 14 && i < 21) {
    lo = 80;
    hi = 220;
  }
  const total = Math.round(lo + rnd() * (hi - lo));
  const added = Math.round(total * (0.5 + rnd() * 0.3));
  const removed = Math.max(0, total - added);
  return {
    hash: Math.abs(Math.round(rnd() * 0xffffff)).toString(16).padStart(6, "0").slice(0, 6),
    author: i % 3 === 0 ? "codex" : "human",
    added,
    removed,
    coauthoredByClaude: i % 4 === 0,
  };
}

export function demo(): DemoSpec {
  const rnd = seeded(77);
  const commits: GitCommit[] = [];
  const frames: string[] = [];
  for (let i = 0; i < 28; i++) {
    commits.push(commitAt(i, rnd));
    const recent = commits.slice(-WINDOW);
    frames.push(renderScreen(recent, "toygarden", i));
  }
  return {
    name: "git-weather",
    fps: 6,
    frames,
    uses: ["core-git-observe", "core-device"],
    tagline: "High-churn days storm, quiet days stay clear.",
  };
}
