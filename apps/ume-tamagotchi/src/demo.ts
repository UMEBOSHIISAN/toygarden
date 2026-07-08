/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/ume-tamagotchi.gif を再生成する。
 * 投稿で喜び、承認待ちが積もると弱り、deploy成功で持ち直す一連を実際の applyEvent() で再現する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import type { PlayEvent } from "@umeplay/contracts";
import { initPet, applyEvent, type Pet } from "./index.ts";
import { renderPet } from "./view.ts";

// 投稿(売上の入口)×3 → 承認待ち×4(積もって弱る) → deploy成功(持ち直す)
const SCRIPT: { event: PlayEvent; caption: string }[] = [
  { event: { kind: "task.done", project: "投稿" }, caption: "とうこう!" },
  { event: { kind: "task.done", project: "投稿" }, caption: "とうこう!" },
  { event: { kind: "task.done", project: "投稿" }, caption: "とうこう!" },
  { event: { kind: "gate.pending", label: "review" }, caption: "しょうにん まち..." },
  { event: { kind: "gate.pending", label: "review" }, caption: "しょうにん まち..." },
  { event: { kind: "gate.pending", label: "review" }, caption: "しょうにん まち..." },
  { event: { kind: "gate.pending", label: "review" }, caption: "しょうにん まち..." },
  { event: { kind: "deploy.success" }, caption: "でぷろい せいこう!" },
];

export function demo(): DemoSpec {
  let pet: Pet = initPet("うめこ");
  const frames: string[] = [];

  frames.push(renderPet(pet, "きょうも いちにち はじまる"));
  frames.push(renderPet(pet, "きょうも いちにち はじまる"));

  for (const { event, caption } of SCRIPT) {
    pet = applyEvent(pet, event); // 実際の applyEvent() を叩く
    frames.push(renderPet(pet, caption));
    frames.push(renderPet(pet, caption));
  }

  frames.push(renderPet(pet, "また あした ね"));
  frames.push(renderPet(pet, "また あした ね"));

  return {
    name: "ume-tamagotchi",
    fps: 5,
    frames,
    uses: ["contracts"],
    tagline: "うめこ育成。投稿で喜び、承認待ちが積もると弱る売上導線の体感版",
  };
}
