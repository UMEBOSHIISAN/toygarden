/**
 * workshop.mjs — pick parts, and a toy grows. Interactive visual assembly tool.
 *
 *   npm run workshop
 *
 * Lists the 8 core packages as "part cards"; move the cursor and toggle parts on,
 * and a live recipe diagram below updates to show them wiring into "your toy".
 * Confirm a name and apps/<name>/ is generated (scaffold reuses new-toy.mjs).
 *
 * TTY-only tool (uses raw mode for single-key selection). Non-TTY prints usage and exit 1.
 *
 * UI is EN-primary (matches hello.mjs's convention: this repo's audience skews international).
 * Any text placed inside a bordered box (cards / the completion box) is ASCII-only on purpose —
 * see the "display width" section below for why.
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
    "workshop is an interactive tool (needs a TTY). Usage: npm run workshop\n" +
      "Pick part cards interactively and grow a toy. In non-interactive environments\n" +
      "(CI, pipes), scaffold directly with: npm run new -- <name>",
  );
  process.exit(1);
}

// --- display width -----------------------------------------------------
// Root cause of the card-border corruption bug (2026-07 real-terminal report): full-width
// (CJK/kana/fullwidth-form) characters render as 2 terminal columns but were being counted
// as 1 when padding card content, so the right-hand border landed in the wrong column and
// (worse, on narrow terminals) long lines wrapped mid-card, cascading misalignment into every
// row drawn after them (including the cursor marker and the footer). Fix has two parts:
//   1. any text placed inside a bordered box is ASCII-only (ASCII width is always 1, so this
//      class of bug structurally can't recur there — see TAGLINES below).
//   2. padding/truncation is done with a real display-width count regardless, as defense in
//      depth for any future core name / text that isn't ASCII.
function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");
}

/** Simplified wcwidth: East-Asian-wide/fullwidth ranges = 2 columns, everything else = 1. */
function charWidth(cp) {
  if (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    cp === 0x2329 ||
    cp === 0x232a ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) || // CJK radicals .. Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK compatibility ideographs
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK compatibility forms
    (cp >= 0xff00 && cp <= 0xff60) || // fullwidth forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK extension planes
  ) {
    return 2;
  }
  return 1;
}

function displayWidth(s) {
  let w = 0;
  for (const ch of stripAnsi(s)) w += charWidth(ch.codePointAt(0));
  return w;
}

/** Pad with plain spaces (ANSI-safe: only counts visible columns) until `target` display columns. */
function padDisplayEnd(s, target) {
  const w = displayWidth(s);
  return w >= target ? s : s + " ".repeat(target - w);
}

// --- part cards (scans packages/ for real; does not hard-code "8") ----------
const packagesDir = join(root, "packages");
const CORE_NAMES = readdirSync(packagesDir)
  .filter((n) => existsSync(join(packagesDir, n, "README.md")))
  .sort();

// manifest.json is a by-product of the demo GIFs (has each toy's `uses`). Missing/broken
// manifest shouldn't take down the whole tool -- fall back to usage=0 / no bloodline match.
const manifestPath = join(root, "demo", "gifs", "manifest.json");
let manifestEntries = [];
if (existsSync(manifestPath)) {
  try {
    manifestEntries = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    manifestEntries = [];
  }
}

function usageCount(core) {
  return manifestEntries.filter((e) => Array.isArray(e.uses) && e.uses.includes(core)).length;
}

// One-line EN taglines, hard-coded on purpose (not extracted from README.md): keeps card
// content ASCII-only, which structurally rules out the full-width-column bug for this text.
const TAGLINES = {
  "core-chiptune": "Turns events into 8-bit chiptune blips.",
  "core-device": "One HAL for tiny panel devices (M5Stack, Ajazz).",
  "core-events": "A minimal event bus wiring producers to consumers.",
  "core-focus-log": "Read-only feed from your focus-cam log.",
  "core-git-observe": "Reads git history: additions, deletions, co-authors.",
  "core-save": "Fail-soft JSON persistence: keep your toy's memory safe.",
  "core-sysmon": "Feel the pulse of your machine (CPU / mem / load).",
  "core-termgif": "Bakes terminal frames into a GIF.",
  "core-tui": "Tiny terminal UI: lanes, badges, ANSI color.",
  "core-worker-data": "Read-only feed of worker routing + collapse stats.",
};

const CORES = CORE_NAMES.map((name) => ({
  name,
  tagline: TAGLINES[name] ?? "(no tagline registered for this core)",
  usage: usageCount(name),
}));

// --- per-core "minimal wiring sample" (import + export added to index.ts) ---
// index.ts stays "pure logic, no side effects" everywhere in this repo (core-device's
// selectDevice()/MockDevice is always instantiated in cli.ts, never in index.ts). The
// snippets below follow the same convention: plain functions that take state/device as a
// parameter instead of owning an instance at module scope.
const WIRING = {
  "core-events": {
    imports: ['import { EventBus } from "@toygarden/core-events";', 'import type { PlayEvent } from "@toygarden/contracts";'],
    extras: [
      "/** core-events wiring sample: subscribe to a bus and receive event kinds. */",
      "export function attachTicker(bus: EventBus, onEvent: (e: PlayEvent) => void): () => void {",
      "  return bus.subscribe(onEvent);",
      "}",
    ],
  },
  "core-device": {
    imports: ['import type { Device } from "@toygarden/core-device";'],
    extras: [
      "/** core-device wiring sample: draw one frame to whichever device you pass in (default: mock). */",
      "export function drawToDevice(device: Device, name: string, tick: number): void {",
      '  device.draw({ op: "clear" });',
      '  device.draw({ op: "text", x: 4, y: 4, text: name });',
      '  device.draw({ op: "text", x: 4, y: 16, text: String(tick) });',
      "  device.flush();",
      "}",
    ],
  },
  "core-chiptune": {
    imports: ['import { motifForEvent, type Motif } from "@toygarden/core-chiptune";', 'import type { PlayEvent } from "@toygarden/contracts";'],
    extras: [
      "/** core-chiptune wiring sample: the fanfare Motif for a deploy.success event. */",
      "export function fanfare(): Motif | null {",
      '  const e: PlayEvent = { kind: "deploy.success" };',
      "  return motifForEvent(e);",
      "}",
    ],
  },
  "core-focus-log": {
    imports: ['import { activityTally, type FocusEvent } from "@toygarden/core-focus-log";'],
    extras: [
      "/** core-focus-log wiring sample: turn a list of focus events into an activity tally. */",
      "export function tallyFocus(events: FocusEvent[]) {",
      "  return activityTally(events);",
      "}",
    ],
  },
  "core-git-observe": {
    imports: ['import { parseGitLog, type GitCommit } from "@toygarden/core-git-observe";'],
    extras: [
      "/** core-git-observe wiring sample: parse raw `git log` text into commits. */",
      "export function commitsFromLog(raw: string): GitCommit[] {",
      "  return parseGitLog(raw);",
      "}",
    ],
  },
  "core-termgif": {
    imports: ['import { hasGlyph } from "@toygarden/core-termgif";'],
    extras: [
      "/** core-termgif wiring sample: does the font actually have this glyph (avoids silent block-fill fallback)? */",
      "export function isRenderable(ch: string): boolean {",
      "  return hasGlyph(ch.codePointAt(0) ?? 0);",
      "}",
    ],
  },
  "core-tui": {
    imports: ['import { renderLanes, type Lane } from "@toygarden/core-tui";'],
    extras: [
      "/** core-tui wiring sample: render the toy's name as a single ok lane. */",
      "export function statusLane(name: string): string {",
      '  const lanes: Lane[] = [{ title: name, items: [{ label: "ready", status: "ok" }] }];',
      "  return renderLanes(lanes);",
      "}",
    ],
  },
  "core-worker-data": {
    imports: ['import { parseCollapseStats, collapseToEvents } from "@toygarden/core-worker-data";'],
    extras: [
      "/** core-worker-data wiring sample: turn a collapse-stats TSV into PlayEvents. */",
      "export function eventsFromTsv(raw: string) {",
      "  return collapseToEvents(parseCollapseStats(raw));",
      "}",
    ],
  },
};

// --- bloodline check: does an existing toy use the exact same core set? -----
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

// --- recipe diagram: selected cores -> "your toy", drawn as ASCII branches --
function renderRecipe(selectedNames) {
  const box = "[ your toy ]";
  if (selectedNames.length === 0) {
    return [`${DIM}  (nothing picked yet -- you'll still get a minimal toy)${RESET}`, `  ${DIM}${box}${RESET}`];
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

// --- card box drawing (display-width safe, always closes on the right) -----
// CARD_INNER is the number of display columns between the vertical bars/corners. Every row of
// a card (top, name, tagline, bottom) is built through cardTop/cardRow/cardBottom so they are
// guaranteed to share the same total display width -- assertCardIntegrity below is a runtime
// self-check for that invariant (same convention as banner.mjs's assertGlyph guard).
const CARD_INNER = 60;

function cardTop(border) {
  return `${border}┌${"─".repeat(CARD_INNER)}┐${RESET}`;
}
function cardBottom(border) {
  return `${border}└${"─".repeat(CARD_INNER)}┘${RESET}`;
}
function cardRow(border, content) {
  return `${border}│${RESET}${padDisplayEnd(content, CARD_INNER)}${border}│${RESET}`;
}

function assertCardIntegrity(rows) {
  const widths = rows.map((r) => displayWidth(r));
  const first = widths[0];
  if (widths.some((w) => w !== first)) {
    throw new Error(
      `workshop.mjs: card row widths don't match (${widths.join(", ")}) -- a border would be misaligned. ` +
        "This should be structurally impossible via cardTop/cardRow/cardBottom; something bypassed them.",
    );
  }
}

// --- screen render (card list + recipe diagram + bloodline message) --------
const CLEAR = "\x1b[2J\x1b[H";

function renderScreen(cursor, selected) {
  const out = [];
  out.push(`${CYAN}${BOLD}=== toygarden workshop ===${RESET}`);
  out.push(`${DIM}Pick parts, and a toy grows.${RESET}`);
  out.push("");
  CORES.forEach((core, i) => {
    const isCursor = i === cursor;
    const isSelected = selected.has(i);
    const border = isCursor ? CYAN : DIM;
    const marker = isCursor ? `${CYAN}▶${RESET}` : " ";
    const heart = isSelected ? `${MAGENTA}♥${RESET}` : " ";
    const nameColor = isSelected ? MAGENTA + BOLD : isCursor ? WHITE + BOLD : DIM;
    const usageLabel = `${DIM}used by ${core.usage} toy${core.usage === 1 ? "" : "s"}${RESET}`;

    const top = cardTop(border);
    const nameRow = cardRow(border, ` ${heart} ${i + 1}) ${nameColor}${core.name}${RESET}  ${usageLabel}`);
    const taglineRow = cardRow(border, `   ${DIM}${core.tagline}${RESET}`);
    const bottom = cardBottom(border);
    assertCardIntegrity([top, nameRow, taglineRow, bottom]);

    out.push(`${marker} ${top}`);
    out.push(`${marker} ${nameRow}`);
    out.push(`${marker} ${taglineRow}`);
    out.push(`${marker} ${bottom}`);
  });
  out.push("");
  out.push(`${YELLOW}${BOLD}RECIPE${RESET}`);
  const selectedNames = [...selected].sort((a, b) => a - b).map((i) => CORES[i].name);
  out.push(...renderRecipe(selectedNames));
  const blood = bloodLine(selectedNames);
  if (selectedNames.length > 0) {
    if (blood) out.push(`  ${YELLOW}same bloodline as ${BOLD}${blood}${RESET}${YELLOW}!${RESET}`);
    else out.push(`  ${YELLOW}a brand-new combination!${RESET}`);
  }
  out.push("");
  out.push(`${DIM}j/k or 1-${CORES.length} = move   space = toggle   Enter = confirm   q = quit${RESET}`);
  return out.join("\n");
}

// --- step 1: card selection (raw mode, single-key) --------------------------
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
        console.log("Aborted.");
        process.exit(130);
      }
      if (str === "q") {
        cleanup();
        console.log("Cancelled.");
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
      // ignore anything else (and don't redraw -- avoids flicker on unmapped keys)
    };

    function cleanup() {
      stdin.removeListener("keypress", onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on("keypress", onKey);
  });
}

// --- step 2: name entry (line-buffered; kebab-case validation shared with new-toy) ---
function askName() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((settle) => {
    process.stdout.write("\n");
    const ask = () => {
      rl.question(`${CYAN}Name your toy (kebab-case, e.g. my-toy): ${RESET}`, (answer) => {
        const rawName = answer.trim();
        if (!rawName) {
          console.log("Cancelled.");
          rl.close();
          process.exit(0);
        }
        if (!KEBAB.test(rawName)) {
          console.log(
            `${YELLOW}"${rawName}" isn't kebab-case (lowercase letters/digits and hyphens only, ` +
              `no leading digit/hyphen, no double hyphens). Try: my-toy${RESET}`,
          );
          return ask();
        }
        if (RESERVED.has(rawName)) {
          console.log(`${YELLOW}"${rawName}" is reserved (it collides with npm run play ${rawName}). Pick another name.${RESET}`);
          return ask();
        }
        if (existsSync(join(appsDir, rawName))) {
          console.log(`${YELLOW}apps/${rawName}/ already exists. Pick another name.${RESET}`);
          return ask();
        }
        rl.close();
        settle(rawName);
      });
    };
    ask();
  });
}

// --- step 3+4: run the scaffold + completion screen -------------------------
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
  say(`${GREEN}${BOLD}apps/${name}/ grew!${RESET}`);
  say("");
  for (const f of files) say(`  ${DIM}${f}${RESET}`);
  say("");
  if (cores.length > 0) say(`${MAGENTA}Parts used: ${cores.join(", ")}${RESET}`);
  else say(`${DIM}No parts (still a minimal toy)${RESET}`);
  say("");
  say(`${YELLOW}Next steps${RESET}`);
  say(`  ${CYAN}npm run check${RESET}          typecheck + test`);
  say(`  ${CYAN}npm run play ${name}${RESET}   watch it run`);
  say(`  ${CYAN}npm run gifs -- ${name}${RESET}   bake demo/gifs/${name}.gif`);
  say(`  Remember to add a row to the "Play catalog (apps/)" table in README.md`);
  lines.push(`${WHITE}└${"─".repeat(boxWidth)}┘${RESET}`);
  console.log("\n" + lines.join("\n"));
}

// --- entrypoint --------------------------------------------------------
const cores = await pickCores();
const name = await askName();
scaffold(name, cores);
process.exit(0);
