import type { PlayEvent } from "@umeplay/contracts";
import { initPet, applyEvent, type Pet } from "./index.ts";
import { renderPet } from "./view.ts";

/**
 * ume-tamagotchi 実行エントリ。
 *   node dist/tamagotchi.mjs             → ライブ（Ctrl+C で終了。1日分のイベントをループ再生）
 *   node dist/tamagotchi.mjs --frames 20 → 20フレームで終了（キャプチャ用）
 */

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

/** 1日分のイベントで pet を育て、日が変わるとまた最初から。 */
function* play(): Generator<string> {
  for (;;) {
    let pet: Pet = initPet("うめこ");
    yield renderPet(pet, "きょうも いちにち はじまる");
    yield renderPet(pet, "きょうも いちにち はじまる");
    for (const { event, caption } of SCRIPT) {
      pet = applyEvent(pet, event);
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
