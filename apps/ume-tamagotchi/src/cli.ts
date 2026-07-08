import type { PlayEvent } from "@toygarden/contracts";
import { selectDevice } from "@toygarden/core-device";
import { initPet, applyEvent, draw, wireButtons, type Pet } from "./index.ts";
import { renderPet } from "./view.ts";

/**
 * ume-tamagotchi 実行エントリ。
 *   node dist/tamagotchi.mjs             → ライブ（Ctrl+C で終了。1日分のイベントをループ再生）
 *   node dist/tamagotchi.mjs --frames 20 → 20フレームで終了（キャプチャ用）
 *
 * TOYGARDEN_DEVICE=m5 npm run play ume-tamagotchi で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

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

/** ボタン A(0)=なでる/B(1)=おやつ で操作される現在の pet。SCRIPT の自動進行と共有する。 */
let pet: Pet = initPet("うめこ");

wireButtons(
  device,
  () => pet,
  (p) => {
    pet = p;
  },
);
device.onButton((button) => {
  if (button === 0) process.stdout.write(`* button A: なでなで〜（${pet.name} mood:${pet.mood}）\n`);
  else if (button === 1) process.stdout.write(`* button B: おやつ もぐもぐ（${pet.name} energy:${pet.energy}）\n`);
});

/** 1日分のイベントで pet を育て、日が変わるとまた最初から。 */
function* play(): Generator<string> {
  for (;;) {
    pet = initPet("うめこ");
    draw(device, pet);
    yield renderPet(pet, "きょうも いちにち はじまる");
    yield renderPet(pet, "きょうも いちにち はじまる");
    for (const { event, caption } of SCRIPT) {
      pet = applyEvent(pet, event);
      draw(device, pet);
      yield renderPet(pet, caption);
      yield renderPet(pet, caption);
    }
    yield renderPet(pet, "また あした ね");
    yield renderPet(pet, "また あした ね");
  }
}

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount);
const gen = play();

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  setInterval(() => {
    process.stdout.write(CLEAR + gen.next().value + "\n");
  }, 320);
} else {
  for (let k = 0; k < frameCount; k++) {
    process.stdout.write(gen.next().value + "\n\n");
  }
}
