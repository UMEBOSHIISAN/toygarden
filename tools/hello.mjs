/**
 * hello.mjs — umeplay 初回起動のオンボーディング。
 * Undertale 風の会話ボックス（白の二重線）で挨拶し、タイプライター演出のあと
 * 「あそぶ/つくる/ながめる/やめる」を ♥ カーソルで選ばせる。
 *
 *   npm run hello
 *
 * 非TTY（CI・パイプ経由）では会話ボックスもキー入力も出さず、案内文だけ出して exit 0。
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";

const root = resolve(new URL("..", import.meta.url).pathname);

const RESET = "\x1b[0m";
const WHITE = "\x1b[97m";
const DIM = "\x1b[2m";
const MAGENTA = "\x1b[35m";

const GREETING_LINES = [
  "* うめぷれい へ ようこそ。",
  "* ここは たんまつで あそびが はえる ばしょ。",
  "* さあ、なにを する?",
];

const CHOICES = [
  { key: "あそぶ", desc: "ぜんぶの おもちゃを じゅんばんに みてまわる" },
  { key: "つくる", desc: "npm run workshop で ぶひんを えらんで おもちゃを はやそう" },
  { key: "ながめる", desc: "ショーケースを ひらく (demo/index.html)" },
  { key: "やめる", desc: "また あそぼうね" },
];

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
function boxLineFrame(shown, inner) {
  return `${WHITE}║ ${RESET}${padEndVisual(shown, inner)}${WHITE} ║${RESET}`;
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

async function showGreeting(lines) {
  const inner = Math.max(...lines.map(stringWidth), 28);
  boxTop(inner);
  boxEmpty(inner);
  for (const line of lines) await typeLine(line, inner);
  boxEmpty(inner);
  boxBottom(inner);
}

// --- 選択肢（♥ カーソル・上下矢印 or 数字・Enter確定） ---------------------
function renderChoices(choices, selected) {
  return choices
    .map((c, i) => {
      const cursor = i === selected ? `${MAGENTA}♥${RESET}` : " ";
      return ` ${cursor} ${i + 1}) ${c.key}  ${DIM}${c.desc}${RESET}`;
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
        console.log(`\n${WHITE}* また あそぼうね。${RESET}`);
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

async function runChoice(index) {
  const choice = CHOICES[index];
  switch (choice.key) {
    case "あそぶ": {
      console.log(`${WHITE}* あそぶ を えらんだ！${RESET}`);
      const child = spawn(process.execPath, [join(root, "tools", "tour.mjs")], {
        stdio: "inherit",
      });
      const code = await new Promise((r) => child.on("exit", (c) => r(c ?? 0)));
      process.exit(code);
      break;
    }
    case "つくる": {
      console.log(`${WHITE}* npm run workshop で ぶひんを えらんで おもちゃを はやそう。${RESET}`);
      process.exit(0);
      break;
    }
    case "ながめる": {
      const indexPath = join(root, "demo", "index.html");
      if (process.platform === "darwin" && existsSync(indexPath)) {
        const child = spawn("open", [indexPath], { stdio: "ignore", detached: true });
        child.unref();
        console.log(`${WHITE}* ショーケースを ひらいた。${RESET}`);
      } else {
        console.log(`${WHITE}* ショーケースは ここ:${RESET} ${indexPath}`);
      }
      process.exit(0);
      break;
    }
    case "やめる":
    default: {
      console.log(`${WHITE}* また あそぼうね。${RESET}`);
      process.exit(0);
    }
  }
}

async function main() {
  if (!process.stdin.isTTY) {
    console.log("umeplay へようこそ。対話端末（TTY）でないので案内だけ:");
    console.log("  npm run tour      -- 全おもちゃを順番に自動再生");
    console.log("  npm run workshop  -- ぶひんを選んでおもちゃを生やす");
    console.log("  npm run play      -- 個別のおもちゃ一覧");
    process.exit(0);
    return;
  }

  await showGreeting(GREETING_LINES);
  console.log("");
  const index = await pickChoice(CHOICES);
  await runChoice(index);
}

main();
