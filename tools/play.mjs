/**
 * play.mjs — どの遊びも1コマンドで起動するランナー。
 *
 *   npm run play                                # おもちゃ箱の一覧（tagline 付き）
 *   npm run play tamagotchi                       # 名前は部分一致（apps/ のディレクトリ名）
 *   npm run play aquarium                       # 曖昧一致（TTY なら番号選択・非TTYならエラー）
 *   npm run play random                         # ランダムに1本起動
 *   npm run play daily                          # 今日の日付をシードに決定論的に1本選んで起動（同じ日は同じ結果）
 *   npm run play routing-slot -- --frames 30    # 追加引数は app の cli にそのまま渡る
 *
 * apps/<name>/src/cli.ts を esbuild でその場バンドル → node 実行。ビルド成果物は dist/ に置く。
 */
import { build } from "esbuild";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";

const root = resolve(new URL("..", import.meta.url).pathname);
const [query, ...rest] = process.argv.slice(2);

const appsDir = join(root, "apps");
const all = readdirSync(appsDir).filter((n) => existsSync(join(appsDir, n, "src", "cli.ts")));

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";

// manifest.json はデモGIFの副産物（tagline 付き）。無い/壊れていても一覧表示自体は諦めない。
const taglines = new Map();
const manifestPath = join(root, "demo", "gifs", "manifest.json");
if (existsSync(manifestPath)) {
  try {
    for (const entry of JSON.parse(readFileSync(manifestPath, "utf8"))) {
      taglines.set(entry.name, entry.tagline ?? "");
    }
  } catch {
    // 壊れた manifest は無視して名前だけの一覧にフォールバック
  }
}

function printList(names) {
  const prefixWidth = "  npm run play ".length + Math.max(...names.map((n) => n.length));
  console.log(`${CYAN}toy box (${names.length}):${RESET}`);
  for (const n of names) {
    const label = `  npm run play ${n}`.padEnd(prefixWidth);
    const tag = taglines.get(n);
    console.log(`${CYAN}${label}${RESET}${tag ? DIM + "  " + tag + RESET : ""}`);
  }
}

if (!query) {
  printList(all);
  process.exit(0);
}

/**
 * キー入力1つを「選択 / キャンセル / 無効」に振り分ける純関数。
 * TTY 有無に依存しないので、ここだけ切り出せば入出力なしで単体検証できる。
 *   resolveChoice("1", 2) → { kind: "select", index: 0 }
 *   resolveChoice("q", 2) / resolveChoice("\r", 2) → { kind: "cancel" }
 *   resolveChoice("9", 2) → { kind: "invalid", input: "9" }
 */
function resolveChoice(str, count) {
  if (str === undefined || str === "q" || str === "\r" || str === "\n" || str === "") {
    return { kind: "cancel" };
  }
  const idx = Number(str);
  if (!Number.isInteger(idx) || idx < 1 || idx > count) {
    return { kind: "invalid", input: str };
  }
  return { kind: "select", index: idx - 1 };
}

/**
 * 曖昧一致時、stdin が TTY のときだけ呼ぶ。番号付き候補（tagline 付き）を出し、
 * 1キー入力（Enter 不要）で選ばせる。q / Enter 空入力 / Ctrl+C はキャンセル。
 */
function pickInteractive(hits) {
  console.log(`${YELLOW}"${query}" is ambiguous — which one?${RESET}`);
  hits.forEach((n, i) => {
    const tag = taglines.get(n);
    console.log(`  ${CYAN}${i + 1})${RESET} ${n}${tag ? DIM + " — " + tag + RESET : ""}`);
  });
  process.stdout.write(`${DIM}which one? [1-${hits.length}] (q to cancel)${RESET} `);

  return new Promise((settle) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    const onKey = (str, key) => {
      stdin.removeListener("keypress", onKey);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      process.stdout.write("\n");

      if (key?.ctrl && key.name === "c") {
        console.log("interrupted.");
        process.exit(130);
      }
      const choice = resolveChoice(str, hits.length);
      if (choice.kind === "cancel") {
        console.log("cancelled.");
        process.exit(0);
      }
      if (choice.kind === "invalid") {
        console.error(`"${choice.input}" — out of range.`);
        process.exit(1);
      }
      settle(hits[choice.index]);
    };
    stdin.on("keypress", onKey);
  });
}

/**
 * その日の日付（ローカルタイムの YYYY-MM-DD）をシードに names から1本を決定論的に選ぶ純関数。
 * 同じ日に何度呼んでも同じ結果になる（日替わりおもちゃ用）。
 *   pickDaily(["a", "b"], new Date(2026, 6, 8)) → 常に同じ要素
 */
function pickDaily(names, date = new Date()) {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  const ordered = [...names].sort();
  return ordered[h % ordered.length];
}

let app;
if (query === "random") {
  app = all[Math.floor(Math.random() * all.length)];
  console.log(`${YELLOW}🎲 ${app}!${RESET}`);
} else if (query === "daily") {
  app = pickDaily(all);
  console.log(`${YELLOW}📅 today's toy: ${app}${RESET}`);
} else {
  const hits = all.filter((n) => n.includes(query));
  if (hits.length === 0) {
    console.error(`no app matches "${query}". candidates:\n` + all.map((n) => `  ${n}`).join("\n"));
    process.exit(1);
  }
  const exact = hits.find((n) => n === query);
  if (hits.length === 1 || exact) {
    app = exact ?? hits[0];
  } else if (process.stdin.isTTY) {
    app = await pickInteractive(hits);
  } else {
    console.error(`"${query}" is ambiguous: ${hits.join(", ")}`);
    process.exit(1);
  }
}
const outfile = join(root, "dist", `${app}.mjs`);
await build({
  entryPoints: [join(appsDir, app, "src", "cli.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  tsconfig: join(root, "tsconfig.json"),
  outfile,
  logLevel: "warning",
});

const child = spawn(process.execPath, [outfile, ...rest], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
