/**
 * contracts/events.ts — umeplay 全 app / core が従う共通語彙。
 *
 * ここは依存ゼロの「葉」。app → core → contracts の一方向依存の終端（設計 §4.6）。
 * 新しい遊びは「新イベント型を1つ足す」か「既存イベントを consume する」だけで接続できる。
 * producer は誰が聞くか知らない・consumer は誰が出したか知らない（疎結合 §4.4）。
 */

export type Agent = "cc" | "codex" | "qwen" | "gemma" | "human";

export type PlayEvent =
  | { kind: "agent.dispatch"; from: Agent; to: Agent; task: string }
  | { kind: "agent.collapse"; agent: Agent; rate: number } // 越権/崩壊率
  | { kind: "git.commit"; added: number; removed: number; coauthoredByClaude: boolean }
  | { kind: "worker.route"; taxonomy: string; worker: Agent; confidence: number }
  | { kind: "gate.pending"; label: string } // human-gate 待ち
  | { kind: "deploy.success" }
  | { kind: "task.done"; project: string }
  | { kind: "focus.activity"; activity: string; at: number } // focus-cam ログ由来（at = epoch ms）
  | { kind: "sys.pulse"; busyness: number; cpuRatio: number; memRatio: number; loadRatio: number }; // core-sysmon 由来

export type PlayEventKind = PlayEvent["kind"];

/** イベントを出す側。誰が聞くかを知らない（疎結合）。 */
export interface Producer {
  /** handler を登録。戻り値の関数を呼ぶと解除。 */
  subscribe(handler: (e: PlayEvent) => void): () => void;
}

/** イベントを受けて描画 / 発音する側。 */
export interface Consumer {
  handle(e: PlayEvent): void;
}
