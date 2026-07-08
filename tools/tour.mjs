/**
 * tour.mjs — apps/ の全おもちゃを8秒ずつ自動再生するツアー。
 * play.mjs と同じ起動ロジック（esbuild その場バンドル → 子プロセス実行）を使い、
 * 合間に Undertale のセーブポイント風の幕間（✱マーク）を挟む。
 *
 *   npm run tour
 *
 * 操作（TTYのみ・複雑にしない簡易版）: Ctrl+C = 今のおもちゃをスキップ / q = ツアー終了
 * 非TTY（CI・パイプ経由）では各おもちゃをフルの8秒表示し、キー操作は受け付けない。
 */
import { build } from "esbuild";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";

const root = resolve(new URL("..", import.meta.url).pathname);
const appsDir = join(root, "apps");
const apps = readdirSync(appsDir)
  .filter((n) => existsSync(join(appsDir, n, "src", "cli.ts")))
  .sort();

const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[97m";
const DIM = "\x1b[2m";

const DURATION_MS = 8000;
const INTERLUDE_MS = 1000;

// manifest.json はデモGIFの副産物（tagline 付き）。無い/壊れていても幕間表示自体は諦めない。
const taglines = new Map();
const manifestPath = join(root, "demo", "gifs", "manifest.json");
if (existsSync(manifestPath)) {
  try {
    for (const entry of JSON.parse(readFileSync(manifestPath, "utf8"))) {
      taglines.set(entry.name, entry.tagline ?? "");
    }
  } catch {
    // 壊れた manifest は無視。tagline なしで進める
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** セーブポイント風の幕間: ✱マーク + 「* {name} — {tagline}」を1行表示。 */
function showInterlude(name) {
  const tagline = taglines.get(name) ?? "";
  console.log("");
  console.log(
    `${YELLOW}✱${RESET}  ${WHITE}* ${name}${RESET}${tagline ? DIM + " — " + tagline + RESET : ""}`,
  );
}

/**
 * TTY のときだけ有効化する軽量キー監視。
 * onSkip = Ctrl+C（今のおもちゃだけ落とす） / onQuit = 'q'（ツアー全体を終える）
 * 非TTYでは setRawMode が使えないので何もしない no-op を返す。
 */
function watchKeys(onSkip, onQuit) {
  if (!process.stdin.isTTY) return () => {};
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;
  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();

  function onKey(str, key) {
    if (str === "q" || str === "Q") {
      onQuit();
      return;
    }
    if (key?.ctrl && key.name === "c") {
      onSkip();
    }
  }
  stdin.on("keypress", onKey);
  return () => {
    stdin.removeListener("keypress", onKey);
    stdin.setRawMode(wasRaw ?? false);
    stdin.pause();
  };
}

/**
 * 1本のおもちゃをビルド→起動→(8秒 or skip/quit)まで待つ。
 * 子プロセスの stdin は inherit しない（ツアー中はキー入力をこちらで一元管理するため）。
 * 戻り値: "quit"（ツアー終了） | "next"（次のおもちゃへ）
 */
async function runApp(name) {
  const outfile = join(root, "dist", `tour-${name}.mjs`);
  try {
    await build({
      entryPoints: [join(appsDir, name, "src", "cli.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      tsconfig: join(root, "tsconfig.json"),
      outfile,
      logLevel: "silent",
    });
  } catch (err) {
    console.error(`${DIM}(${name} のビルドに失敗。スキップ: ${err.message}${RESET})`);
    return "next";
  }

  const child = spawn(process.execPath, [outfile], { stdio: ["ignore", "inherit", "inherit"] });

  let verdict = "next";
  const timer = setTimeout(() => child.kill("SIGTERM"), DURATION_MS);
  const stopWatch = watchKeys(
    () => child.kill("SIGTERM"),
    () => {
      verdict = "quit";
      child.kill("SIGTERM");
    },
  );

  await new Promise((settle) => child.on("exit", settle));
  clearTimeout(timer);
  stopWatch();
  return verdict;
}

// timeout コマンド等からの外部終了でも静かに終わる（子プロセスは spawn 側の exit で片付く）
process.on("SIGTERM", () => process.exit(0));

async function main() {
  if (apps.length === 0) {
    console.log("おもちゃが見つからない。apps/ を確認して。");
    process.exit(1);
  }

  console.log(`${WHITE}umeplay ツアー — ${apps.length}本を8秒ずつ${RESET}`);
  if (process.stdin.isTTY) {
    console.log(`${DIM}(Ctrl+C でスキップ / q でツアー終了)${RESET}`);
  }

  const visited = [];
  for (const name of apps) {
    showInterlude(name);
    await sleep(INTERLUDE_MS);
    visited.push(name);
    const verdict = await runApp(name);
    if (verdict === "quit") break;
  }

  const pick = visited[visited.length - 1] ?? apps[0];
  console.log("");
  console.log(`${WHITE}* ツアーおわり! きにいったのは ${DIM}npm run play ${pick}${RESET}`);
}

main();
