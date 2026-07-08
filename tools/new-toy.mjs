/**
 * new-toy.mjs — 60秒で新しいおもちゃを生やすスキャフォールダ。
 *
 *   npm run new -- my-toy
 *
 * apps/<name>/ に「動く最小のおもちゃ」（index/cli/demo/test 一式）を1発で生成する。
 * 生成直後に npm run check / npm run play <name> / npm run gifs が通る状態で出す。
 * テンプレートはこのファイルに埋め込み（外部テンプレファイルなし）。
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const appsDir = join(root, "apps");

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const RESERVED = new Set(["random"]); // play.mjs の予約語と衝突させない

const rawName = process.argv[2];

if (!rawName) {
  console.error("使い方: npm run new -- <name>   (例: npm run new -- my-toy)");
  process.exit(1);
}
if (!KEBAB.test(rawName)) {
  console.error(
    `"${rawName}" はケバブケースじゃない（小文字英数字とハイフンのみ・数字/ハイフン始まり・連続ハイフン不可）。例: my-toy`,
  );
  process.exit(1);
}
if (RESERVED.has(rawName)) {
  console.error(`"${rawName}" は予約語（npm run play ${rawName} と衝突する）。別の名前にして。`);
  process.exit(1);
}

const name = rawName;
const dir = join(appsDir, name);
if (existsSync(dir)) {
  console.error(`apps/${name}/ は既に存在する。別の名前にして。`);
  process.exit(1);
}

// --- テンプレート本体 -------------------------------------------------
// 生成する TS/JSON の中身は「単純文字列」で組み立てる（JSの template literal は使わない）。
// バッククォートや ${...} をそのまま出力したい行が多く、外側で template literal を使うと
// 二重解釈の罠になるため、name の差し込みは "+" 連結だけに限定する。

function packageJsonFile(appName) {
  return (
    JSON.stringify(
      {
        name: `@umeplay/${appName}`,
        version: "0.0.0",
        type: "module",
        main: "src/index.ts",
      },
      null,
      2,
    ) + "\n"
  );
}

function tsconfigJsonFile() {
  return (
    JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        include: ["src", "test"],
      },
      null,
      2,
    ) + "\n"
  );
}

function indexTsFile(appName) {
  return [
    "/**",
    " * " + appName + " — 名前の文字が1文字ずつ跳ねるだけの最小トイ。`npm run new` が生成した土台。",
    " * ここを書き換えて育てる（core を組み合わせるなら package.json に依存を追加する）。",
    " */",
    "",
    'const RESET = "\\x1b[0m";',
    'const CYAN = "\\x1b[36m";',
    'const BOLD = "\\x1b[1m";',
    "",
    "/** tick 番目にどの文字が跳ねているかを純関数で決める（決定論的・seed 不要）。 */",
    "export function bouncingIndex(tick: number, length: number): number {",
    "  return length <= 0 ? 0 : tick % length;",
    "}",
    "",
    "/** 1フレーム分の描画。跳ねている文字だけ1段上に浮かせる。 */",
    "export function renderFrame(name: string, tick: number): string {",
    "  const chars = [...name];",
    "  const hop = bouncingIndex(tick, chars.length);",
    '  const top = chars.map((c, i) => (i === hop ? c.toUpperCase() : " ")).join(" ");',
    '  const base = chars.map((c) => c.toUpperCase()).join(" ");',
    "  return [",
    "    `  ${CYAN}~ ${name} ~${RESET}`,",
    '    "",',
    "    `  ${BOLD}${top}${RESET}`,",
    "    `  ${base}`,",
    '  ].join("\\n");',
    "}",
    "",
  ].join("\n");
}

function cliTsFile(appName) {
  return [
    "/**",
    " * " + appName + " 実行エントリ。",
    " *   node dist/" + appName + ".mjs              → ライブ表示（Ctrl+C で終了）",
    " *   node dist/" + appName + ".mjs --frames 24   → 24フレームで終了（キャプチャ用）",
    " */",
    'import { renderFrame } from "./index.ts";',
    "",
    'const CLEAR = "\\x1b[2J\\x1b[H";',
    'const HIDE = "\\x1b[?25l";',
    'const SHOW = "\\x1b[?25h";',
    'const NAME = "' + appName + '";',
    "",
    "const argv = process.argv.slice(2);",
    'const fi = argv.indexOf("--frames");',
    "const frameCount = fi >= 0 ? Number(argv[fi + 1]) : null;",
    "",
    "let tick = 0;",
    "",
    "if (frameCount !== null) {",
    "  for (let i = 0; i < frameCount; i++) {",
    '    process.stdout.write(renderFrame(NAME, tick) + "\\n\\n");',
    "    tick++;",
    "  }",
    "} else {",
    "  process.stdout.write(HIDE);",
    "  const done = (): void => {",
    '    process.stdout.write(SHOW + "\\n");',
    "    process.exit(0);",
    "  };",
    '  process.on("SIGINT", done);',
    '  process.on("SIGTERM", done);',
    "  setInterval(() => {",
    '    process.stdout.write(CLEAR + renderFrame(NAME, tick) + "\\n");',
    "    tick++;",
    "  }, 300);",
    "}",
    "",
  ].join("\n");
}

function demoTsFile(appName) {
  return [
    "/**",
    " * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。`npm run new` が生成した最小デモ。",
    " */",
    'import type { DemoSpec } from "@umeplay/core-termgif";',
    'import { renderFrame } from "./index.ts";',
    "",
    "export function demo(): DemoSpec {",
    '  const name = "' + appName + '";',
    "  const frames: string[] = [];",
    "  const total = Math.max(6, [...name].length * 3);",
    "  for (let i = 0; i < total; i++) frames.push(renderFrame(name, i));",
    "  return {",
    '    name: "' + appName + '",',
    "    fps: 5,",
    "    frames,",
    "    uses: [],",
    '    tagline: "名前の文字が1文字ずつ跳ねる最小トイ",',
    "  };",
    "}",
    "",
  ].join("\n");
}

function testTsFile(appName) {
  return [
    'import { describe, it, expect } from "vitest";',
    'import { renderFrame, bouncingIndex } from "../src/index.js";',
    "",
    'describe("' + appName + '", () => {',
    '  it("bounces through every character index over one cycle", () => {',
    "    const length = 4;",
    "    const seen = new Set<number>();",
    "    for (let t = 0; t < length; t++) seen.add(bouncingIndex(t, length));",
    "    expect(seen.size).toBe(length);",
    "  });",
    "",
    '  it("renders a non-empty frame with the name in it", () => {',
    '    const out = renderFrame("' + appName + '", 0);',
    "    expect(out.length).toBeGreaterThan(0);",
    '    expect(out).toContain("' + appName + '");',
    "  });",
    "});",
    "",
  ].join("\n");
}

// --- 生成 --------------------------------------------------------------

mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "test"), { recursive: true });

writeFileSync(join(dir, "package.json"), packageJsonFile(name));
writeFileSync(join(dir, "tsconfig.json"), tsconfigJsonFile());
writeFileSync(join(dir, "src", "index.ts"), indexTsFile(name));
writeFileSync(join(dir, "src", "cli.ts"), cliTsFile(name));
writeFileSync(join(dir, "src", "demo.ts"), demoTsFile(name));
writeFileSync(join(dir, "test", `${name}.test.ts`), testTsFile(name));

console.log(`apps/${name}/ を生成した:`);
console.log(`  apps/${name}/package.json`);
console.log(`  apps/${name}/tsconfig.json`);
console.log(`  apps/${name}/src/index.ts`);
console.log(`  apps/${name}/src/cli.ts`);
console.log(`  apps/${name}/src/demo.ts`);
console.log(`  apps/${name}/test/${name}.test.ts`);
console.log("");
console.log("次の一歩:");
console.log(`  npm run check              # typecheck + test（このまま緑になるはず）`);
console.log(`  npm run play ${name}   # 起動して見る（Ctrl+C で終了）`);
console.log(`  npm run gifs -- ${name}   # demo/gifs/${name}.gif を生成`);
console.log(`  README.md の「遊びカタログ（apps/）」表に1行追加するのを忘れずに`);
