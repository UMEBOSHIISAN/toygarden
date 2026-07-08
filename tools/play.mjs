/**
 * play.mjs — どの遊びも1コマンドで起動するランナー。
 *
 *   npm run play                                # おもちゃ箱の一覧（tagline 付き）
 *   npm run play aquarium                       # 名前は部分一致（apps/ のディレクトリ名）
 *   npm run play random                         # ランダムに1本起動
 *   npm run play routing-slot -- --frames 30    # 追加引数は app の cli にそのまま渡る
 *
 * apps/<name>/src/cli.ts を esbuild でその場バンドル → node 実行。ビルド成果物は dist/ に置く。
 */
import { build } from "esbuild";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

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
  console.log(`${CYAN}おもちゃ箱（${names.length}本）:${RESET}`);
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

let app;
if (query === "random") {
  app = all[Math.floor(Math.random() * all.length)];
  console.log(`${YELLOW}🎲 ${app}!${RESET}`);
} else {
  const hits = all.filter((n) => n.includes(query));
  if (hits.length === 0) {
    console.error(`"${query}" に一致する app がない。候補:\n` + all.map((n) => `  ${n}`).join("\n"));
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`"${query}" が曖昧: ${hits.join(", ")}`);
    process.exit(1);
  }
  app = hits[0];
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
