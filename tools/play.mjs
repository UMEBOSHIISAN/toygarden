/**
 * play.mjs — どの遊びも1コマンドで起動するランナー。
 *
 *   npm run play aquarium            # 名前は部分一致（apps/ のディレクトリ名）
 *   npm run play routing-slot -- --frames 30   # 追加引数は app の cli にそのまま渡る
 *
 * apps/<name>/src/cli.ts を esbuild でその場バンドル → node 実行。ビルド成果物は dist/ に置く。
 */
import { build } from "esbuild";
import { readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const [query, ...rest] = process.argv.slice(2);

const appsDir = join(root, "apps");
const all = readdirSync(appsDir).filter((n) => existsSync(join(appsDir, n, "src", "cli.ts")));

if (!query) {
  console.log("実行できる遊び:\n" + all.map((n) => `  npm run play ${n}`).join("\n"));
  process.exit(0);
}

const hits = all.filter((n) => n.includes(query));
if (hits.length === 0) {
  console.error(`"${query}" に一致する app がない。候補:\n` + all.map((n) => `  ${n}`).join("\n"));
  process.exit(1);
}
if (hits.length > 1) {
  console.error(`"${query}" が曖昧: ${hits.join(", ")}`);
  process.exit(1);
}

const app = hits[0];
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
