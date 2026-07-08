/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/pomodoro-forge.gif を再生成する。
 * 実際の tick()/applyEvent() を叩いて、鉱石が育ち→精錬され→25分満タンで完成するまでを再現する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import { FOCUS_MS, initForge, tick, applyEvent, type ForgeState } from "./index.ts";
import { renderForge, renderDone } from "./view.ts";

const STEP_MS = FOCUS_MS / 10; // 2.5分刻み（ore が1段ずつ育つ）

export function demo(): DemoSpec {
  let state: ForgeState = initForge();
  const frames: string[] = [];

  const pushTick = (): void => {
    state = tick(state, STEP_MS); // 実際の tick() を叩く
    frames.push(renderForge(state, "こつこつ さぎょうちゅう...", false));
  };
  const pushCommit = (): void => {
    state = applyEvent(state, { kind: "git.commit", added: 12, removed: 2, coauthoredByClaude: true });
    frames.push(renderForge(state, "せいれん !", true));
    frames.push(renderForge(state, "せいれん !", true));
    frames.push(renderForge(state, "せいれん !", true));
  };

  frames.push(renderForge(state, "こうせき が そだつのを まつ", false));
  frames.push(renderForge(state, "こうせき が そだつのを まつ", false));

  for (let i = 0; i < 3; i++) pushTick();
  pushCommit();
  for (let i = 0; i < 4; i++) pushTick();
  pushCommit();
  for (let i = 0; i < 3; i++) pushTick(); // 最後の1回で elapsedMs が FOCUS_MS に到達 → done

  for (let k = 0; k < 4; k++) frames.push(renderDone(state));

  return {
    name: "pomodoro-forge",
    fps: 5,
    frames,
    uses: ["core-chiptune", "core-device"],
    tagline: "25分の集中で鉱石が育ち、git.commit で精錬。完成でファンファーレ",
  };
}
