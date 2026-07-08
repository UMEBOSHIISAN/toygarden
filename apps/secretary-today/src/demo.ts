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
  投稿: "とうこう",
  発送: "はっそう",
  データ: "でーた",
  経理: "けいり",
  開発: "かいはつ",
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
      { label: "けさの とうこうあん", status: "blocked" },
      { label: "よやくとうこう 20:45", status: "blocked" },
    ],
    発送: [
      { label: "ちゅうもん 3けん", status: "blocked" },
      { label: "らべる いんさつ", status: "blocked" },
    ],
    データ: [{ label: "utm しゅうけい", status: "blocked" }],
    経理: [{ label: "つきじの しわけ", status: "blocked" }],
    開発: [{ label: "あんていしてる ので さわらない", status: "idle" }],
  };

  const resolveOrder: Step[] = [
    { lane: "投稿", label: "けさの とうこうあん" },
    { lane: "投稿", label: "よやくとうこう 20:45" },
    { lane: "発送", label: "ちゅうもん 3けん" },
    { lane: "発送", label: "らべる いんさつ" },
    { lane: "データ", label: "utm しゅうけい" },
    { lane: "経理", label: "つきじの しわけ" },
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
      `${DIM}とまってるものから かたづける${RESET}  ${badge(n)}`;
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
    tagline: "今日の優先順位をレーンで表示。blocked は赤く沈む",
  };
}

// PRIORITY を demo でも触っておく（順序が変わったらこのデモも自然に変わる）
void PRIORITY;
