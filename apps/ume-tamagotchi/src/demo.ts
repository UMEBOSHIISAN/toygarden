/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/ume-tamagotchi.gif を再生成する。
 * 投稿で喜び、承認待ちが積もると弱り、deploy成功で持ち直す一連を実際の applyEvent() で再現する。
 */
import type { DemoSpec } from "@toygarden/core-termgif";
import type { PlayEvent } from "@toygarden/contracts";
import { initPet, applyEvent, type Pet } from "./index.ts";
import { renderPet } from "./view.ts";

// 投稿(売上の入口)×3 → 承認待ち×4(積もって弱る) → deploy成功(持ち直す)
const SCRIPT: { event: PlayEvent; caption: string }[] = [
  { event: { kind: "task.done", project: "投稿" }, caption: "post!" },
  { event: { kind: "task.done", project: "投稿" }, caption: "post!" },
  { event: { kind: "task.done", project: "投稿" }, caption: "post!" },
  { event: { kind: "gate.pending", label: "review" }, caption: "awaiting approval..." },
  { event: { kind: "gate.pending", label: "review" }, caption: "awaiting approval..." },
  { event: { kind: "gate.pending", label: "review" }, caption: "awaiting approval..." },
  { event: { kind: "gate.pending", label: "review" }, caption: "awaiting approval..." },
  { event: { kind: "deploy.success" }, caption: "deploy success!" },
];

export function demo(): DemoSpec {
  let pet: Pet = initPet("Umeko");
  const frames: string[] = [];

  frames.push(renderPet(pet, "today begins"));
  frames.push(renderPet(pet, "today begins"));

  for (const { event, caption } of SCRIPT) {
    pet = applyEvent(pet, event); // 実際の applyEvent() を叩く
    frames.push(renderPet(pet, caption));
    frames.push(renderPet(pet, caption));
  }

  frames.push(renderPet(pet, "see you tomorrow"));
  frames.push(renderPet(pet, "see you tomorrow"));

  return {
    name: "ume-tamagotchi",
    fps: 5,
    frames,
    uses: ["contracts"],
    tagline: "Raise Umeko: she's happy when you post, sulks when things stall.",
  };
}
