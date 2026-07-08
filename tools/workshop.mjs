/**
 * workshop.mjs — 部品を目で見て選ぶと、おもちゃが生える対話型ワークショップ。
 *
 *   npm run workshop
 *
 * packages/ の8つの core を「部品カード」として並べ、カーソルで選んで組み合わせると、
 * 画面下に「あなたのおもちゃ」へ繋がるレシピ図がリアルタイムで更新される。
 * 名前を決めて Enter すると apps/<name>/ が生成される（scaffold の実体は new-toy.mjs を再利用）。
 *
 * TTY 前提のツール（1キー選択に raw mode を使う）。非TTYでは使い方を出して exit 1。
 */
import { readdirSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline";
import {
  root,
  appsDir,
  KEBAB,
  RESERVED,
  packageJsonFile,
  tsconfigJsonFile,
  indexTsFile,
  cliTsFile,
  demoTsFile,
  testTsFile,
} from "./new-toy.mjs";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const WHITE = "\x1b[37m";

if (!process.stdin.isTTY) {
  console.error(
    "workshop は対話式ツール（TTY が必要）。使い方: npm run workshop\n" +
      "対話的に部品カードを選んでおもちゃを組み立てる。非対話環境（CI・パイプ経由）では\n" +
      "npm run new -- <name> で直接 scaffold して。",
  );
  process.exit(1);
}

// --- 部品カードのデータ（packages/ を実走査。8個決め打ちにしない） -----------
const packagesDir = join(root, "packages");
const CORE_NAMES = readdirSync(packagesDir)
  .filter((n) => existsSync(join(packagesDir, n, "README.md")))
  .sort();

// manifest.json はデモGIFの副産物（uses 一覧）。無い/壊れていても一覧表示自体は諦めない。
const manifestPath = join(root, "demo", "gifs", "manifest.json");
let manifestEntries = [];
if (existsSync(manifestPath)) {
  try {
    manifestEntries = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    manifestEntries = []; // 壊れた manifest は無視して usage=0 / blood-line なしにフォールバック
  }
}

function usageCount(core) {
  return manifestEntries.filter((e) => Array.isArray(e.uses) && e.uses.includes(core)).length;
}

/** README.md の見出し直後の説明パラグラフから最初の一文だけを抜く（1行責務用）。壊れていたら空文字。 */
function readCoreSummary(core) {
  try {
    const text = readFileSync(join(packagesDir, core, "README.md"), "utf8");
    const paras = text.split(/\r?\n\r?\n/).map((p) => p.trim());
    const desc = paras.find((p, i) => i > 0 && p.length > 0 && !p.startsWith("#")) ?? "";
    const oneLine = desc.replace(/\r?\n/g, "");
    const period = oneLine.indexOf("。");
    const sentence = period >= 0 ? oneLine.slice(0, period + 1) : oneLine;
    return sentence.replace(/\*\*/g, "").replace(/`/g, "");
  } catch {
    return "";
  }
}

const CORES = CORE_NAMES.map((name) => ({
  name,
  summary: readCoreSummary(name),
  usage: usageCount(name),
}));

// --- core ごとの「最小配線サンプル」（index.ts に import + export として足すコード） ---
// index.ts は「純ロジックのみ・副作用なし」がこのリポジトリの一貫した設計（core-device の
// selectDevice() / MockDevice はどのアプリも cli.ts 側で生成しており index.ts では作らない）。
// ここに足す関数も同じ流儀に揃える: 引数で state/deviceを受け取るだけの純関数にする。
const WIRING = {
  "core-events": {
    imports: ['import { EventBus } from "@umeplay/core-events";', 'import type { PlayEvent } from "@umeplay/contracts";'],
    extras: [
      "/** core-events 配線サンプル: バスに繋いで、来たイベントの種類を受け取る。 */",
      "export function attachTicker(bus: EventBus, onEvent: (e: PlayEvent) => void): () => void {",
      "  return bus.subscribe(onEvent);",
      "}",
    ],
  },
  "core-device": {
    imports: ['import type { Device } from "@umeplay/core-device";'],
    extras: [
      "/** core-device 配線サンプル: 選んだデバイス（既定は mock）に1フレーム描く。 */",
      "export function drawToDevice(device: Device, name: string, tick: number): void {",
      '  device.draw({ op: "clear" });',
      '  device.draw({ op: "text", x: 4, y: 4, text: name });',
      '  device.draw({ op: "text", x: 4, y: 16, text: String(tick) });',
      "  device.flush();",
      "}",
    ],
  },
  "core-chiptune": {
    imports: ['import { motifForEvent, type Motif } from "@umeplay/core-chiptune";', 'import type { PlayEvent } from "@umeplay/contracts";'],
    extras: [
      "/** core-chiptune 配線サンプル: deploy.success のファンファーレ Motif を返す。 */",
      "export function fanfare(): Motif | null {",
      '  const e: PlayEvent = { kind: "deploy.success" };',
      "  return motifForEvent(e);",
      "}",
    ],
  },
  "core-focus-log": {
    imports: ['import { activityTally, type FocusEvent } from "@umeplay/core-focus-log";'],
    extras: [
      "/** core-focus-log 配線サンプル: focus イベント列を活動集計に変換する。 */",
      "export function tallyFocus(events: FocusEvent[]) {",
      "  return activityTally(events);",
      "}",
    ],
  },
  "core-git-observe": {
    imports: ['import { parseGitLog, type GitCommit } from "@umeplay/core-git-observe";'],
    extras: [
      "/** core-git-observe 配線サンプル: git log 生テキストをコミット列にパースする。 */",
      "export function commitsFromLog(raw: string): GitCommit[] {",
      "  return parseGitLog(raw);",
      "}",
    ],
  },
  "core-termgif": {
    imports: ['import { hasGlyph } from "@umeplay/core-termgif";'],
    extras: [
      "/** core-termgif 配線サンプル: この文字がフォントに実在するか（塗りつぶし化けの事前チェック）。 */",
      "export function isRenderable(ch: string): boolean {",
      "  return hasGlyph(ch.codePointAt(0) ?? 0);",
      "}",
    ],
  },
  "core-tui": {
    imports: ['import { renderLanes, type Lane } from "@umeplay/core-tui";'],
    extras: [
      "/** core-tui 配線サンプル: 名前を1レーンの ok 表示にする。 */",
      "export function statusLane(name: string): string {",
      '  const lanes: Lane[] = [{ title: name, items: [{ label: "ready", status: "ok" }] }];',
      "  return renderLanes(lanes);",
      "}",
    ],
  },
  "core-worker-data": {
    imports: ['import { parseCollapseStats, collapseToEvents } from "@umeplay/core-worker-data";'],
    extras: [
      "/** core-worker-data 配線サンプル: collapse stats TSV を PlayEvent 列に変換する。 */",
      "export function eventsFromTsv(raw: string) {",
      "  return collapseToEvents(parseCollapseStats(raw));",
      "}",
    ],
  },
};

// --- 血筋判定: 選んだ組合せと同じ core セットの既存おもちゃがあるか ---------
function bloodLine(selectedNames) {
  if (selectedNames.length === 0) return null;
  const selectedSet = new Set(selectedNames);
  for (const entry of manifestEntries) {
    const cores = (entry.uses ?? []).filter((u) => u !== "contracts");
    if (cores.length !== selectedSet.size) continue;
    if (cores.every((c) => selectedSet.has(c))) return entry.name;
  }
  return null;
}

// --- レシピ図（選んだ core → あなたのおもちゃ、を ASCII の線でつなぐ） ------
function renderRecipe(selectedNames) {
  const box = "[ あなたのおもちゃ ]";
  if (selectedNames.length === 0) {
    return [`${DIM}  (まだ何も選んでいない — このままでも最小トイは生える)${RESET}`, `  ${DIM}${box}${RESET}`];
  }
  const lines = [];
  selectedNames.forEach((name, i) => {
    const isLast = i === selectedNames.length - 1;
    const branch = selectedNames.length === 1 ? "──" : isLast ? "└─" : i === 0 ? "┬─" : "├─";
    const arrow = isLast ? `──> ${GREEN}${box}${RESET}` : "";
    lines.push(`  ${CYAN}${name}${RESET} ${branch}${arrow}`);
  });
  return lines;
}

// --- 画面描画（カード一覧 + レシピ図 + 血筋メッセージ） ---------------------
const CLEAR = "\x1b[2J\x1b[H";

function renderScreen(cursor, selected) {
  const out = [];
  out.push(`${CYAN}${BOLD}=== umeplay workshop ===${RESET}`);
  out.push(`${DIM}部品を選ぶと、おもちゃが生える。${RESET}`);
  out.push("");
  const BORDER_WIDTH = 58;
  CORES.forEach((core, i) => {
    const isCursor = i === cursor;
    const isSelected = selected.has(i);
    const border = isCursor ? CYAN : DIM;
    const heart = isSelected ? `${MAGENTA}♥${RESET}` : " ";
    const nameColor = isSelected ? MAGENTA + BOLD : isCursor ? WHITE + BOLD : DIM;
    const marker = isCursor ? `${CYAN}▶${RESET}` : " ";
    const usageLabel = `${DIM}(使用中のおもちゃ: ${core.usage})${RESET}`;
    out.push(`${marker} ${border}┌${"─".repeat(BORDER_WIDTH)}┐${RESET}`);
    out.push(`${marker} ${border}│${RESET} ${heart} ${i + 1}) ${nameColor}${core.name}${RESET}  ${usageLabel}`);
    const summary = core.summary || "(README.md から一言責務を読めなかった)";
    out.push(`${marker} ${border}│${RESET}   ${DIM}${summary}${RESET}`);
    out.push(`${marker} ${border}└${"─".repeat(BORDER_WIDTH)}┘${RESET}`);
  });
  out.push("");
  out.push(`${YELLOW}${BOLD}レシピ${RESET}`);
  const selectedNames = [...selected].sort((a, b) => a - b).map((i) => CORES[i].name);
  out.push(...renderRecipe(selectedNames));
  const blood = bloodLine(selectedNames);
  if (selectedNames.length > 0) {
    if (blood) out.push(`  ${YELLOW}この組合せは ${BOLD}${blood}${RESET}${YELLOW} とおなじ血筋!${RESET}`);
    else out.push(`  ${YELLOW}はじめての組合せ!${RESET}`);
  }
  out.push("");
  out.push(`${DIM}j/k or 数字(1-${CORES.length}) = カーソル移動  space = 選択切替  Enter = 決定  q = やめる${RESET}`);
  return out.join("\n");
}

// --- ステップ1: カード選択（raw mode・1キー） -------------------------------
function pickCores() {
  return new Promise((settle) => {
    let cursor = 0;
    const selected = new Set();
    process.stdout.write(CLEAR + renderScreen(cursor, selected));

    const stdin = process.stdin;
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    const redraw = () => process.stdout.write(CLEAR + renderScreen(cursor, selected));

    const onKey = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        cleanup();
        console.log("中断した。");
        process.exit(130);
      }
      if (str === "q") {
        cleanup();
        console.log("キャンセルした。");
        process.exit(0);
      }
      if (str === "j" || key?.name === "down") {
        cursor = (cursor + 1) % CORES.length;
        redraw();
        return;
      }
      if (str === "k" || key?.name === "up") {
        cursor = (cursor - 1 + CORES.length) % CORES.length;
        redraw();
        return;
      }
      if (str >= "1" && str <= String(CORES.length)) {
        cursor = Number(str) - 1;
        redraw();
        return;
      }
      if (str === " ") {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
        redraw();
        return;
      }
      if (str === "\r" || str === "\n") {
        cleanup();
        settle([...selected].sort((a, b) => a - b).map((i) => CORES[i].name));
        return;
      }
      // 無効キーは無視（再描画もしない — ちらつき防止）
    };

    function cleanup() {
      stdin.removeListener("keypress", onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on("keypress", onKey);
  });
}

// --- ステップ2: 名前入力（行バッファ・kebab-case バリデーションは new-toy と共通） ---
function askName() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((settle) => {
    process.stdout.write("\n");
    const ask = () => {
      rl.question(`${CYAN}おもちゃの名前 (kebab-case, 例: my-toy): ${RESET}`, (answer) => {
        const rawName = answer.trim();
        if (!rawName) {
          console.log("キャンセルした。");
          rl.close();
          process.exit(0);
        }
        if (!KEBAB.test(rawName)) {
          console.log(
            `${YELLOW}"${rawName}" はケバブケースじゃない（小文字英数字とハイフンのみ・数字/ハイフン始まり・連続ハイフン不可）。例: my-toy${RESET}`,
          );
          return ask();
        }
        if (RESERVED.has(rawName)) {
          console.log(`${YELLOW}"${rawName}" は予約語（npm run play ${rawName} と衝突する）。別の名前にして。${RESET}`);
          return ask();
        }
        if (existsSync(join(appsDir, rawName))) {
          console.log(`${YELLOW}apps/${rawName}/ は既に存在する。別の名前にして。${RESET}`);
          return ask();
        }
        rl.close();
        settle(rawName);
      });
    };
    ask();
  });
}

// --- ステップ3+4: scaffold 実行 + 完了画面 ---------------------------------
function scaffold(name, cores) {
  const dir = join(appsDir, name);

  const importSet = new Set();
  const extras = [];
  for (const core of cores) {
    const w = WIRING[core];
    if (!w) continue;
    for (const line of w.imports) importSet.add(line);
    extras.push(...w.extras, "");
  }
  const imports = [...importSet];

  mkdirSync(join(dir, "src"), { recursive: true });
  mkdirSync(join(dir, "test"), { recursive: true });

  writeFileSync(join(dir, "package.json"), packageJsonFile(name, cores));
  writeFileSync(join(dir, "tsconfig.json"), tsconfigJsonFile());
  writeFileSync(join(dir, "src", "index.ts"), indexTsFile(name, { imports, extras }));
  writeFileSync(join(dir, "src", "cli.ts"), cliTsFile(name));
  writeFileSync(join(dir, "src", "demo.ts"), demoTsFile(name, cores));
  writeFileSync(join(dir, "test", `${name}.test.ts`), testTsFile(name));

  const files = [
    `apps/${name}/package.json`,
    `apps/${name}/tsconfig.json`,
    `apps/${name}/src/index.ts`,
    `apps/${name}/src/cli.ts`,
    `apps/${name}/src/demo.ts`,
    `apps/${name}/test/${name}.test.ts`,
  ];

  const boxWidth = 62;
  const lines = [];
  lines.push(`${WHITE}┌${"─".repeat(boxWidth)}┐${RESET}`);
  const say = (text) => lines.push(`${WHITE}│${RESET} ${text}`);
  say(`${GREEN}${BOLD}apps/${name}/ が生えた!${RESET}`);
  say("");
  for (const f of files) say(`  ${DIM}${f}${RESET}`);
  say("");
  if (cores.length > 0) say(`${MAGENTA}使った部品: ${cores.join(", ")}${RESET}`);
  else say(`${DIM}部品なし（最小トイのまま）${RESET}`);
  say("");
  say(`${YELLOW}つぎの一歩${RESET}`);
  say(`  ${CYAN}npm run check${RESET}          typecheck + test`);
  say(`  ${CYAN}npm run play ${name}${RESET}   起動して見る`);
  say(`  ${CYAN}npm run gifs -- ${name}${RESET}   demo/gifs/${name}.gif を焼く`);
  say(`  README.md の「遊びカタログ（apps/）」表に1行追加するのを忘れずに`);
  lines.push(`${WHITE}└${"─".repeat(boxWidth)}┘${RESET}`);
  console.log("\n" + lines.join("\n"));
}

// --- entrypoint --------------------------------------------------------
const cores = await pickCores();
const name = await askName();
scaffold(name, cores);
process.exit(0);
