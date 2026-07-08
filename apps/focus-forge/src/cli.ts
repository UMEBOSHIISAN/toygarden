import type { FocusEvent } from "@toygarden/core-focus-log";
import { selectDevice } from "@toygarden/core-device";
import { forgeFromFocus, draw } from "./index.ts";
import { renderForge } from "./view.ts";

/**
 * focus-forge 実行エントリ。
 *   node dist/focusforge.mjs             → ライブ（Ctrl+C で終了。サンプル1日分をループ再生）
 *   node dist/focusforge.mjs --frames 27 → 27フレームで終了（キャプチャ用）
 *
 * 実データ接続は将来 `readFocusRows()`（core-focus-log）を差し込むだけで済む設計。
 * ここではサンプルの活動ログで forgeFromFocus() を実際に叩いて見せる。
 *
 * TOYGARDEN_DEVICE=m5 npm run play focus-forge で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const BASE = 1_783_200_000_000;

const EVENTS: { activity: string; caption: string; work: boolean }[] = [
  { activity: "作業をしている", caption: "さぎょう ちゅう", work: true },
  { activity: "書いていた", caption: "かいて いた", work: true },
  { activity: "考え事をしていた", caption: "かんがえごと ちゅう", work: true },
  { activity: "休憩中", caption: "きゅうけい", work: false },
  { activity: "見ていた", caption: "みて いた", work: true },
  { activity: "打っていた", caption: "うって いた", work: true },
  { activity: "読んでいた", caption: "よんで いた", work: true },
  { activity: "散歩中", caption: "さんぽ ちゅう", work: false },
  { activity: "作業をしている", caption: "さぎょう ちゅう", work: true },
];

/** サンプル1日分の活動ログで鍛えて→締めて、を無限に繰り返す画面ジェネレータ。 */
function* play(): Generator<string> {
  for (;;) {
    const focusEvents: FocusEvent[] = EVENTS.map((e, i) => ({
      id: i + 1,
      at: BASE + i * 60_000,
      activity: e.activity,
      hasPhoto: false,
    }));
    draw(device, { ore: 0, ingots: 0 });
    yield renderForge({ ore: 0, ingots: 0 }, "けいそく かいし", false, false);
    let prevIngots = 0;
    for (let i = 0; i < focusEvents.length; i++) {
      const f = forgeFromFocus(focusEvents.slice(0, i + 1));
      draw(device, f);
      const harvestFlash = f.ingots > prevIngots;
      const reps = harvestFlash ? 4 : 2;
      for (let r = 0; r < reps; r++) yield renderForge(f, EVENTS[i].caption, EVENTS[i].work, harvestFlash);
      prevIngots = f.ingots;
    }
    const final = forgeFromFocus(focusEvents);
    for (let k = 0; k < 4; k++) yield renderForge(final, "きょうの ぶんは ここまで", false, false);
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
