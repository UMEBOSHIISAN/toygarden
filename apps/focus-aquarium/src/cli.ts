import { toFocusEvents, readFocusRows, DEFAULT_FOCUS_DB, type FocusEvent } from "@umeplay/core-focus-log";
import { renderScreen, dayStream } from "./demo.ts";

/**
 * focus-aquarium 実行エントリ。
 *   node dist/focus-aquarium.mjs               → 合成の1日をライブ再生（Ctrl+C で終了）
 *   node dist/focus-aquarium.mjs --frames 16   → 16フレーム描いて終了（キャプチャ用）
 *   node dist/focus-aquarium.mjs --db <path>   → 実際の focus-cam ログ（未指定なら既定パス）を1回だけ描画
 */

const CLEAR = "\x1b[2J\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const argv = process.argv.slice(2);
const dbFlagIdx = argv.indexOf("--db");
const useDb = dbFlagIdx >= 0 || argv.includes("--db-default");
const fi = argv.indexOf("--frames");
const frameCount = fi >= 0 ? Number(argv[fi + 1]) : Infinity;
const live = !Number.isFinite(frameCount) && !useDb;

async function fromDb(): Promise<void> {
  const dbPath = dbFlagIdx >= 0 && argv[dbFlagIdx + 1] ? argv[dbFlagIdx + 1] : DEFAULT_FOCUS_DB;
  try {
    const rows = await readFocusRows(dbPath);
    const events: FocusEvent[] = toFocusEvents(rows);
    process.stdout.write(renderScreen(events) + "\n");
  } catch (err) {
    process.stderr.write(`focus ログを読めませんでした（${dbPath}）: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

if (useDb) {
  await fromDb();
} else {
  const all = dayStream();

  if (live) {
    process.stdout.write(HIDE);
    const done = (): void => {
      process.stdout.write(SHOW + "\n");
      process.exit(0);
    };
    process.on("SIGINT", done);
    process.on("SIGTERM", done);
    let revealed = 1;
    setInterval(() => {
      process.stdout.write(CLEAR + renderScreen(all.slice(0, revealed), " (Ctrl+C で しゅうりょう)") + "\n");
      revealed = revealed >= all.length ? 1 : revealed + 1;
    }, 500);
  } else {
    for (let i = 0; i < frameCount; i++) {
      const revealed = (i % all.length) + 1;
      process.stdout.write(renderScreen(all.slice(0, revealed)) + "\n\n");
    }
  }
}
