import type { PlayEvent } from "@umeplay/contracts";

export interface Note {
  note: string;
  ms: number;
}
export interface Motif {
  notes: Note[];
}

const n = (note: string, ms = 120): Note => ({ note, ms });

/**
 * イベント種別ごとの音モチーフ（設計 §chiptune-themes）。
 * human-gate待ち=上昇アルペジオ / collapse=トライトーン不協和 / deploy成功=ファンファーレ。
 */
export const MOTIFS = {
  gatePending: { notes: [n("C4"), n("E4"), n("G4"), n("C5")] },
  collapse: { notes: [n("C4", 200), n("F#4", 300)] }, // トライトーン
  deploySuccess: {
    notes: [n("C4"), n("E4"), n("G4"), n("C5"), n("G4", 100), n("C5", 300)],
  },
} satisfies Record<string, Motif>;

/** PlayEvent を鳴らすべきモチーフに写像（consume 側）。対象外は null。 */
export function motifForEvent(e: PlayEvent): Motif | null {
  switch (e.kind) {
    case "gate.pending":
      return MOTIFS.gatePending;
    case "agent.collapse":
      return MOTIFS.collapse;
    case "deploy.success":
      return MOTIFS.deploySuccess;
    default:
      return null;
  }
}
