/**
 * hello.mjs — umeplay 初回起動のオンボーディング。
 * Undertale 風の会話ボックス（白の二重線）で挨拶し、タイプライター演出のあと
 * 「PLAY/BUILD/WATCH/BYE」を ♥ カーソルで選ばせる。
 *
 *   npm run hello
 *
 * UI は EN 主役（想定オーディエンスは海外が主）。タイプライター行は英語、その下に
 * dim であしらいの日本語を1行添える。非TTY（CI・パイプ経由）では会話ボックスも
 * キー入力も出さず、英語の案内文だけ出して exit 0。
 *
 * UMEPLAY_CONTEXT=package のとき（npx 経由の bin から渡される契約）は案内コマンドを
 * `npx umeplay <sub>` 形式に切り替える。未設定 or "repo" なら従来の `npm run <sub>` 形式。
 * BUILD は repo コンテキストでは tools/workshop.mjs を直接起動する（PLAY が tour.mjs を
 * 起動するのと同じ流儀）。package コンテキストでは workshop がリポジトリを必要とするため
 * clone を案内するだけに留める。
 *
 * TTY のときだけ冒頭で映画的スプラッシュ（splash.mjs）を1回流してから会話ボックスへ繋ぐ。
 * `UMEPLAY_NO_SPLASH=1` で省略できる（毎回見るとうざくなるため・playSplash 側も同じ変数を見る）。
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { playSplash } from "./splash.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);

const RESET = "\x1b[0m";
const WHITE = "\x1b[97m";
const DIM = "\x1b[2m";
const MAGENTA = "\x1b[35m";

const CONTEXT = process.env.UMEPLAY_CONTEXT === "package" ? "package" : "repo";
function cmd(sub) {
  return CONTEXT === "package" ? `npx umeplay ${sub}` : `npm run ${sub}`;
}
const REPO_CLONE_HINT = "git clone https://github.com/UMEBOSHIISAN/umeplay.git";

// EN 主役 + JP dim 併記（タイプライターは EN 行のみ・JP は静かな添え書き）
const GREETING_LINES = [
  { en: "* Welcome to umeplay.", jp: "ようこそ。" },
  { en: "* This is where terminal toys grow.", jp: "たんまつで あそびが はえる ばしょ。" },
  { en: "* So, what shall we do?", jp: "さあ、なにを する?" },
];

function buildChoices() {
  const buildDesc =
    CONTEXT === "package"
      ? `building needs the repo -> ${REPO_CLONE_HINT}`
      : "pick parts and grow a toy";
  return [
    { key: "PLAY", label: "PLAY (あそぶ)", desc: "watch every toy, one after another" },
    { key: "BUILD", label: "BUILD (つくる)", desc: buildDesc },
    { key: "WATCH", label: "WATCH (ながめる)", desc: "open the showcase (demo/index.html)" },
    { key: "BYE", label: "BYE (やめる)", desc: "see you next time" },
  ];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 全角文字は2セル分として幅計算する（雑にざっくり: CJK/かな/記号レンジなら2セル扱い）
function charWidth(ch) {
  const cp = ch.codePointAt(0);
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x3000 && cp <= 0x303f)
  ) {
    return 2;
  }
  return 1;
}
function stringWidth(s) {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return w;
}
function padEndVisual(s, width) {
  return s + " ".repeat(Math.max(0, width - stringWidth(s)));
}

// --- 会話ボックス（文字罫線の二重線） --------------------------------------
function boxTop(inner) {
  console.log(`${WHITE}╔${"═".repeat(inner + 2)}╗${RESET}`);
}
function boxBottom(inner) {
  console.log(`${WHITE}╚${"═".repeat(inner + 2)}╝${RESET}`);
}
function boxEmpty(inner) {
  console.log(`${WHITE}║${RESET}${" ".repeat(inner + 2)}${WHITE}║${RESET}`);
}
function boxLineFrame(shown, inner, contentColor = "") {
  return `${WHITE}║ ${RESET}${contentColor}${padEndVisual(shown, inner)}${RESET}${WHITE} ║${RESET}`;
}

async function typeLine(text, inner, ms = 24) {
  let shown = "";
  for (const ch of text) {
    shown += ch;
    process.stdout.write(`\r${boxLineFrame(shown, inner)}`);
    await sleep(ms);
  }
  process.stdout.write("\n");
}
function printDimLine(text, inner) {
  console.log(boxLineFrame(text, inner, DIM));
}

async function showGreeting(pairs) {
  const allTexts = pairs.flatMap((p) => [p.en, p.jp]);
  const inner = Math.max(...allTexts.map(stringWidth), 28);
  boxTop(inner);
  boxEmpty(inner);
  for (const { en, jp } of pairs) {
    await typeLine(en, inner);
    printDimLine(jp, inner);
  }
  boxEmpty(inner);
  boxBottom(inner);
}

// --- 選択肢（♥ カーソル・上下矢印 or 数字・Enter確定） ---------------------
function renderChoices(choices, selected) {
  return choices
    .map((c, i) => {
      const cursor = i === selected ? `${MAGENTA}♥${RESET}` : " ";
      return ` ${cursor} ${i + 1}) ${c.label}  ${DIM}${c.desc}${RESET}`;
    })
    .join("\n");
}

function pickChoice(choices) {
  return new Promise((settle) => {
    let selected = 0;
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    console.log(renderChoices(choices, selected));

    function redraw() {
      process.stdout.write(`\x1b[${choices.length}A`);
      for (const line of renderChoices(choices, selected).split("\n")) {
        process.stdout.write(`\x1b[2K${line}\n`);
      }
    }
    function cleanup() {
      stdin.removeListener("keypress", onKey);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    }
    function onKey(str, key) {
      if (key?.ctrl && key.name === "c") {
        cleanup();
        console.log(`\n${WHITE}* See you next time.${RESET}`);
        process.exit(130);
      }
      if (key?.name === "up") {
        selected = (selected - 1 + choices.length) % choices.length;
        redraw();
        return;
      }
      if (key?.name === "down") {
        selected = (selected + 1) % choices.length;
        redraw();
        return;
      }
      if (key?.name === "return") {
        cleanup();
        settle(selected);
        return;
      }
      const n = Number(str);
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
        selected = n - 1;
        redraw();
        cleanup();
        settle(selected);
      }
    }
    stdin.on("keypress", onKey);
  });
}

async function runChoice(choices, index) {
  const choice = choices[index];
  switch (choice.key) {
    case "PLAY": {
      console.log(`${WHITE}* PLAY selected!${RESET}`);
      const child = spawn(process.execPath, [join(root, "tools", "tour.mjs")], {
        stdio: "inherit",
      });
      const code = await new Promise((r) => child.on("exit", (c) => r(c ?? 0)));
      process.exit(code);
      break;
    }
    case "BUILD": {
      if (CONTEXT === "package") {
        console.log(`${WHITE}* Building needs the repo -> ${RESET}${REPO_CLONE_HINT}`);
        process.exit(0);
        break;
      }
      console.log(`${WHITE}* BUILD selected!${RESET}`);
      const child = spawn(process.execPath, [join(root, "tools", "workshop.mjs")], {
        stdio: "inherit",
      });
      const code = await new Promise((r) => child.on("exit", (c) => r(c ?? 0)));
      process.exit(code);
      break;
    }
    case "WATCH": {
      const indexPath = join(root, "demo", "index.html");
      if (process.platform === "darwin" && existsSync(indexPath)) {
        const child = spawn("open", [indexPath], { stdio: "ignore", detached: true });
        child.unref();
        console.log(`${WHITE}* Opened the showcase.${RESET}`);
      } else {
        console.log(`${WHITE}* The showcase is here:${RESET} ${indexPath}`);
      }
      process.exit(0);
      break;
    }
    case "BYE":
    default: {
      console.log(`${WHITE}* See you next time.${RESET}`);
      process.exit(0);
    }
  }
}

async function main() {
  if (!process.stdin.isTTY) {
    const buildLine =
      CONTEXT === "package"
        ? `  building needs the repo -> ${REPO_CLONE_HINT}`
        : `  ${cmd("workshop")}  -- pick parts and grow a toy`;
    console.log("Welcome to umeplay. No interactive terminal (TTY) here, so just the basics:");
    console.log(`  ${cmd("tour")}      -- watch every toy, one after another`);
    console.log(buildLine);
    console.log(`  ${cmd("play")}      -- list of individual toys`);
    process.exit(0);
    return;
  }

  if (process.env.UMEPLAY_NO_SPLASH !== "1") {
    await playSplash();
  }

  await showGreeting(GREETING_LINES);
  console.log("");
  const choices = buildChoices();
  const index = await pickChoice(choices);
  await runChoice(choices, index);
}

main();
