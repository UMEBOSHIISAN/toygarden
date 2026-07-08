/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 *
 * UME_SOUL の一日: 朝は全部止まっている → 優先順位（投稿→発送→データ→経理）の順に
 * blocked が解けていき、開発レーンだけは最後まで idle のまま（「安定していれば触らない」）。
 *
 * レーン title は index.ts の PRIORITY（漢字）が正だが、GIF フォントは漢字未収録のため
 * 表示だけ かな に写し替える（buildLanes / blockedCount のロジックは実物を叩く）。
 */
import { seeded, type DemoSpec } from "@umeplay/core-termgif";
import { renderLanes, badge, type Lane } from "@umeplay/core-tui";
import { buildLanes, blockedCount, PRIORITY, type TodayState, type LaneKey } from "./index.ts";

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/** 漢字レーン名 → かな表示（GIF フォント都合の表示写像。ロジックは PRIORITY のまま） */
const KANA: Record<LaneKey, string> = {
  投稿: "posting",
  発送: "shipping",
  データ: "data",
  経理: "accounting",
  開発: "dev",
};

interface Step {
  lane: LaneKey;
  label: string;
}

export function demo(): DemoSpec {
  const rnd = seeded(567);

  // 一日の進行: 優先順位の高いレーンから順に blocked → ok に変わる
  const state: TodayState = {
    投稿: [
      { label: "this morning's post draft", status: "blocked" },
      { label: "scheduled post 20:45", status: "blocked" },
    ],
    発送: [
      { label: "3 orders", status: "blocked" },
      { label: "label printing", status: "blocked" },
    ],
    データ: [{ label: "UTM tally", status: "blocked" }],
    経理: [{ label: "monthly bookkeeping", status: "blocked" }],
    開発: [{ label: "stable, don't touch", status: "idle" }],
  };

  const resolveOrder: Step[] = [
    { lane: "投稿", label: "this morning's post draft" },
    { lane: "投稿", label: "scheduled post 20:45" },
    { lane: "発送", label: "3 orders" },
    { lane: "発送", label: "label printing" },
    { lane: "データ", label: "UTM tally" },
    { lane: "経理", label: "monthly bookkeeping" },
  ];

  const frames: string[] = [];
  const push = (): void => {
    const lanes: Lane[] = buildLanes(state).map((l) => ({
      ...l,
      title: KANA[l.title as LaneKey] ?? l.title,
    }));
    const n = blockedCount(state);
    const header =
      `  ${CYAN}~ secretary-today ~${RESET}  ` +
      `${DIM}clear what's stopped first${RESET}  ${badge(n)}`;
    frames.push(header + "\n\n" + renderLanes(lanes));
  };

  // 朝の状態をしばらく見せる → 1件ずつ解決 → 全部片づいた画面で余韻
  push();
  push();
  for (const step of resolveOrder) {
    const items = state[step.lane] ?? [];
    const hit = items.find((i) => i.label === step.label);
    if (hit) hit.status = "ok";
    push();
    // たまに1フレーム溜めて「作業している間」を出す
    if (rnd() < 0.4) push();
  }
  push();
  push();
  push();

  return {
    name: "secretary-today",
    fps: 4,
    frames,
    uses: ["core-tui"],
    tagline: "Today's priorities as lanes; blocked items sink in red.",
  };
}

// PRIORITY を demo でも触っておく（順序が変わったらこのデモも自然に変わる）
void PRIORITY;
