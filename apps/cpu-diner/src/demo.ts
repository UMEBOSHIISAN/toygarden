/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * 合成 busyness 波形で「暇 → 混雑 → 満席・行列 → 暇」の1ループを見せる。dinerLogic に流し込むだけで
 * 客の着席・行列形成・chef の居眠り⇄調理が全部ついてくる（renderDiner は state だけを見る純関数）。
 * `npm run gifs` が拾って demo/gifs/cpu-diner.gif を再生成する。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import { dinerLogic, initDinerState, renderDiner } from "./index.ts";

const FRAME_COUNT = 40;

/**
 * 40ティック分の合成 busyness 推移（決定論的・seed 不要、tick index だけから決まる）:
 *   0-5    : 暇（chef 居眠り）
 *   6-15   : じわじわ混み始める
 *   16-23  : 満席ラインを超えて行列ができる
 *   24-31  : 行列が続く満席状態を維持
 *   32-39  : 客が帰っていき、また暇に戻る（1ループ完結）
 */
function busynessAt(i: number): number {
  if (i < 6) return 0.05;
  if (i < 16) return 0.05 + ((i - 6) / 10) * 0.55; // 0.05 -> 0.6
  if (i < 24) return 0.6 + ((i - 16) / 8) * 0.35; // 0.6 -> 0.95 (行列が発生する水準)
  if (i < 32) return 0.95; // 満席・行列キープ
  return Math.max(0.05, 0.95 - ((i - 32) / 8) * 0.9); // 0.95 -> 0.05 (帰っていく)
}

export function demo(): DemoSpec {
  let state = initDinerState(7);
  const frames: string[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    state = dinerLogic(state, busynessAt(i));
    frames.push(renderDiner(state).join("\n"));
  }
  return {
    name: "cpu-diner",
    fps: 8,
    frames,
    uses: ["core-sysmon"],
    tagline: "customers rush in when your CPU sweats",
  };
}
