import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPCM, encodeWav } from "./synth.js";
import type { Motif } from "./motif.js";

/**
 * モチーフを実際に鳴らす adapter（macOS の afplay 経由）。
 * 純ロジック(synth)から分離した副作用境界。テスト対象外（実機/OS依存）。
 */
export function play(motif: Motif): void {
  const wav = encodeWav(renderPCM(motif));
  const dir = mkdtempSync(join(tmpdir(), "umeplay-chiptune-"));
  const file = join(dir, "motif.wav");
  writeFileSync(file, wav);
  execFileSync("afplay", [file]);
}
