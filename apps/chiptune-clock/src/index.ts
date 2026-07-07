import type { Device } from "@umeplay/core-device";
import { renderPCM, encodeWav, type Motif } from "@umeplay/core-chiptune";

/**
 * chiptune-clock （chiptune × device）
 * → 「時刻を 8bit で告げる時計」。毎正時に "時の数" だけ鐘のモチーフを鳴らし、パネルに時刻表示。
 * OSS価値: M5/ターミナルの常駐チップチューン置時計。
 */

/** hour(0-23) → 12時間制の鐘の数だけ音を並べたモチーフ。 */
export function chimeFor(hour: number): Motif {
  const strikes = ((((hour % 12) + 11) % 12) + 1); // 0時/12時=12, 1時=1 ...
  const notes = Array.from({ length: strikes }, (_, i) => ({
    note: i % 2 === 0 ? "C5" : "G4",
    ms: 160,
  }));
  return { notes };
}

export function chimeWav(hour: number): Uint8Array {
  return encodeWav(renderPCM(chimeFor(hour)));
}

export function drawClock(device: Device, hour: number, minute: number): void {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  device.draw({ op: "clear" });
  device.draw({ op: "text", x: 20, y: 20, text: `${hh}:${mm}` });
  device.flush();
}
