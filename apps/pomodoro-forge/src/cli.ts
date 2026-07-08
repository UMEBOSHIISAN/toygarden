import { selectDevice } from "@toygarden/core-device";
import { FOCUS_MS, initForge, tick, applyEvent, draw, type ForgeState } from "./index.ts";
import { renderForge, renderDone } from "./view.ts";

/**
 * pomodoro-forge 実行エントリ。
 *   node dist/forge.mjs             → ライブ（Ctrl+C で終了。25分ぶんをループ再生）
 *   node dist/forge.mjs --frames 22 → 22フレームで終了（キャプチャ用）
 *
 * TOYGARDEN_DEVICE=m5 npm run play pomodoro-forge で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const STEP_MS = FOCUS_MS / 10;

/** 鉱石が育つ→精錬→満タンで完成、を無限に繰り返す画面ジェネレータ。 */
function* play(): Generator<string> {
  for (;;) {
    let state: ForgeState = initForge();
    draw(device, state);
    yield renderForge(state, "こうせき が そだつのを まつ", false);
    yield renderForge(state, "こうせき が そだつのを まつ", false);

    const doTick = function* (): Generator<string> {
      state = tick(state, STEP_MS);
      draw(device, state);
      yield renderForge(state, "こつこつ さぎょうちゅう...", false);
    };
    const doCommit = function* (): Generator<string> {
      state = applyEvent(state, { kind: "git.commit", added: 12, removed: 2, coauthoredByClaude: true });
      draw(device, state);
      yield renderForge(state, "せいれん !", true);
      yield renderForge(state, "せいれん !", true);
      yield renderForge(state, "せいれん !", true);
    };

    for (let i = 0; i < 3; i++) yield* doTick();
    yield* doCommit();
    for (let i = 0; i < 4; i++) yield* doTick();
    yield* doCommit();
    for (let i = 0; i < 3; i++) yield* doTick();

    for (let k = 0; k < 4; k++) yield renderDone(state);
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
  }, 260);
} else {
  for (let k = 0; k < frameCount; k++) {
    process.stdout.write(gen.next().value + "\n\n");
  }
}
