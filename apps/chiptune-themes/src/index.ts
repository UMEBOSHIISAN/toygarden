import type { PlayEvent } from "@toygarden/contracts";
import {
  motifForEvent,
  renderPCM,
  encodeWav,
  play,
  type Motif,
} from "@toygarden/core-chiptune";
import { EventBus } from "@toygarden/core-events";

/**
 * chiptune-themes — chiptune-notify 拡張 "event themes"。
 * イベント種別ごとに音モチーフを割り当て（gate待ち/collapse/deploy成功）、
 * EventBus に繋ぐと human-gate 待ち等を音色で知らせる（M5 bell 連動想定）。
 */

export interface Theme {
  motif: Motif;
  wav: Uint8Array;
}

/** イベント → 鳴らす音テーマ（WAV付き）。対象外イベントは null。 */
export function themeFor(e: PlayEvent): Theme | null {
  const motif = motifForEvent(e);
  if (!motif) return null;
  return { motif, wav: encodeWav(renderPCM(motif)) };
}

/** EventBus を購読して該当イベントを実際に鳴らす（afplay 経由・副作用境界）。 */
export function attachNotifier(bus: EventBus): () => void {
  return bus.subscribe((e) => {
    const motif = motifForEvent(e);
    if (motif) play(motif);
  });
}
