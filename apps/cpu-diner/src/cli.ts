import { selectDevice } from "@toygarden/core-device";
import { dinerLogic, drawDiner, initDinerState, playCpuDiner, renderDiner } from "./index.ts";

/**
 * cpu-diner 実行エントリ。
 *   node dist/cpu-diner.mjs                 → 実 sysmon の busyness をライブ表示（Ctrl+C で終了）
 *   node dist/cpu-diner.mjs --frames 24     → 実CPUに依存しない合成 busyness 波形を24フレームで終了（キャプチャ用）
 *
 * TOYGARDEN_DEVICE=m5 npm run play cpu-diner で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : null;

/** 実 CPU に依存しない合成 busyness 波形（--frames キャプチャ専用。sin波で静か〜繁忙を往復）。 */
function syntheticBusyness(tick: number): number {
  return Math.max(0, Math.min(1, (Math.sin(tick / 10) + 1) / 2));
}

if (frameCount !== null) {
  let state = initDinerState();
  for (let i = 0; i < frameCount; i++) {
    state = dinerLogic(state, syntheticBusyness(i));
    drawDiner(device, state);
    process.stdout.write(renderDiner(state).join("\n") + "\n\n");
  }
  process.exit(0);
}

const stop = playCpuDiner({ device });
const done = (): void => {
  stop();
  process.exit(0);
};
process.on("SIGINT", done);
process.on("SIGTERM", done);
