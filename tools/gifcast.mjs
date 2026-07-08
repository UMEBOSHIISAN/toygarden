/**
 * gifcast.mjs — 全 app の src/demo.ts を拾って demo/gifs/*.gif を量産するランナー。
 *
 *   npm run gifs             # demo.ts を持つ全 app の GIF を再生成
 *   npm run gifs -- aquarium # 名前に一致する app だけ
 *   npm run gifs -- --crt ascii-aquarium # レトロ CRT 版を demo/crt/ に出力（opt-in）
 *
 * 各 app の demo() は DemoSpec（@umeplay/core-termgif 参照）を返す。決定論的なので
 * 同じコードから常に同じ GIF が出る。demo/gifs/manifest.json に一覧も書く。
 * --crt は demo/gifs/*.gif・manifest.json には一切触れない別出力先（additive）。
 */
import { build } from "esbuild";
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const crtIdx = rawArgs.indexOf("--crt");
const crtMode = crtIdx !== -1;
if (crtMode) rawArgs.splice(crtIdx, 1);
const filter = rawArgs[0] ?? "";

if (crtMode && filter === "") {
  console.error("--crt には対象 app 名が必要 (例: node tools/gifcast.mjs --crt ascii-aquarium)");
  process.exit(1);
}

const appsDir = join(root, "apps");
const outDir = join(root, "demo", "gifs");
const crtOutDir = join(root, "demo", "crt");
const tmpDir = join(root, "dist", "demos");
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });
if (crtMode) mkdirSync(crtOutDir, { recursive: true });

const apps = readdirSync(appsDir).filter((name) => {
  if (!existsSync(join(appsDir, name, "src", "demo.ts"))) return false;
  return name.includes(filter);
});

if (apps.length === 0) {
  console.error(`demo.ts を持つ app が見つからない (filter="${filter}")`);
  process.exit(1);
}

const { renderGif, renderCrtGif } = await import(
  pathToFileURL(await bundle(join(root, "packages", "core-termgif", "src", "index.ts"), "core-termgif")).href
);

async function bundle(entry, name) {
  const outfile = join(tmpDir, `${name}.mjs`);
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    tsconfig: join(root, "tsconfig.json"),
    outfile,
    logLevel: "silent",
  });
  return outfile;
}

const manifest = [];
for (const app of apps) {
  const entry = join(appsDir, app, "src", "demo.ts");
  const mod = await import(pathToFileURL(await bundle(entry, `demo-${app}`)).href);
  if (typeof mod.demo !== "function") {
    console.error(`SKIP ${app}: demo() が export されていない`);
    continue;
  }
  const spec = mod.demo();
  if (!spec.frames?.length) {
    console.error(`SKIP ${app}: frames が空`);
    continue;
  }

  if (crtMode) {
    const gif = renderCrtGif(spec.frames, { fps: spec.fps });
    const file = join(crtOutDir, `${spec.name}.gif`);
    writeFileSync(file, gif);
    const kb = Math.round(statSync(file).size / 1024);
    console.log(`OK crt/${spec.name}.gif  ${spec.frames.length}f @${spec.fps}fps  ${kb}KB`);
    continue; // demo/gifs・manifest.json には触れない
  }

  const gif = renderGif(spec.frames, { fps: spec.fps });
  const file = join(outDir, `${spec.name}.gif`);
  writeFileSync(file, gif);
  const kb = Math.round(statSync(file).size / 1024);
  console.log(`OK ${spec.name}.gif  ${spec.frames.length}f @${spec.fps}fps  ${kb}KB`);
  manifest.push({
    name: spec.name,
    file: `${spec.name}.gif`,
    frames: spec.frames.length,
    fps: spec.fps,
    kb,
    uses: spec.uses ?? [],
    tagline: spec.tagline ?? "",
  });
}

// filter 実行時は manifest を書かない（全量 run の結果だけを正とする）
if (filter === "") {
  manifest.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest.json: ${manifest.length} 本`);
}
