import type { FocusEvent } from "@toygarden/core-focus-log";
import type { Device } from "@toygarden/core-device";
import { MOTIFS, type Motif } from "@toygarden/core-chiptune";

/**
 * focus-forge （focus-log × chiptune × device）
 * → 「実際の集中(focus-cam)で鉱石を鍛える」。作業中の記録で ore が育ち、
 * 休止(idle)が入ると精錬されて ingot になる。完了で deploy 成功ファンファーレ。
 * OSS価値: pomodoro を"自己申告"でなく実測アクティビティで駆動する。
 */

const WORK_HINTS = ["考え事", "作業", "見て", "読ん", "書い", "打っ"];
const isWork = (a: string): boolean => WORK_HINTS.some((w) => a.includes(w));

export interface Forge {
  ore: number;
  ingots: number;
}

export function forgeFromFocus(events: FocusEvent[]): Forge {
  let ore = 0;
  let ingots = 0;
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    if (isWork(e.activity)) ore++;
    else {
      ingots += Math.floor(ore / 3);
      ore = ore % 3;
    }
  }
  return { ore, ingots };
}

export function completionMotif(f: Forge): Motif | null {
  return f.ingots > 0 ? MOTIFS.deploySuccess : null;
}

export function draw(device: Device, f: Forge): void {
  device.draw({ op: "clear" });
  device.draw({ op: "text", x: 8, y: 8, text: `ore ${"#".repeat(f.ore)}` });
  device.draw({ op: "text", x: 8, y: 32, text: `ingots:${f.ingots}` });
  device.flush();
}
