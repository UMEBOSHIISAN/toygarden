import { selectDevice } from "@toygarden/core-device";
import { chimeFor, drawClock } from "./index.ts";
import { bigClock, bell } from "./demo.ts";

/**
 * chiptune-clock 実行エントリ。実時刻を表示し、正時をまたぐと chimeFor(hour) の鐘を鳴らす（視覚表示のみ）。
 *   node dist/chiptune-clock.mjs             → ライブ時計（1秒毎更新・Ctrl+Cで終了）
 *   node dist/chiptune-clock.mjs --frames 20 → 20フレーム描いて終了（キャプチャ用）
 *
 * TOYGARDEN_DEVICE=m5 npm run play chiptune-clock で M5StickC Plus にも同時描画（既定は mock）。
 */

const device = selectDevice();

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const argv = process.argv.slice(2);
const fi = argv.indexOf("--frames");
const frames = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frames);

let lastMinute = -1;
let ringing = false;
let strikesShown = 0;

function frame(colonOn: boolean): string {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (minute !== lastMinute) {
    lastMinute = minute;
    ringing = minute === 0;
    strikesShown = 0;
  }
  const strikes = chimeFor(hour).notes.length;
  if (ringing && strikesShown < strikes) strikesShown++;

  drawClock(device, hour, minute);

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const color = ringing ? YELLOW : CYAN;
  const header = `  ${CYAN}~ chiptune-clock ~${RESET}  ${DIM}8bit の じこく つげ どけい (Ctrl+C で しゅうりょう)${RESET}`;
  const clock = bigClock(hh, mm, colonOn, color);
  const chimeLabel = ringing
    ? `  ${YELLOW}${BOLD}かね ${strikesShown}/${strikes}${RESET}`
    : `  ${DIM}つぎの かねは まいしょう0ふん${RESET}`;
  return `${header}\n\n${clock}\n\n${bell(strikes, ringing ? strikesShown : 0)}\n${chimeLabel}`;
}

if (live) {
  process.stdout.write(HIDE);
  const done = (): void => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  };
  process.on("SIGINT", done);
  process.on("SIGTERM", done);
  let colonOn = true;
  setInterval(() => {
    colonOn = !colonOn;
    process.stdout.write(CLEAR + frame(colonOn) + "\n");
  }, 1000);
} else {
  for (let i = 0; i < frames; i++) {
    process.stdout.write(frame(i % 2 === 0) + "\n\n");
  }
}
