#!/usr/bin/env node
/**
 * umeplay — thin router for `npx umeplay`.
 *
 * package.json is still `"private": true`; a human must flip that to
 * `false` right before `npm publish`. This file makes no assumption about
 * that flag — it only needs to work once the package is actually published.
 *
 * Two run modes, decided at runtime by what's on disk:
 *   1. Published package — `dist/apps/<name>.mjs` exists (built ahead of
 *      time by `npm run prepack`, see bin/prepack.mjs). Run the prebuilt
 *      bundle directly. No esbuild/typescript needed at runtime.
 *   2. Source checkout — `apps/<name>/src/cli.ts` sources exist alongside
 *      the workspaces package.json. Delegate to tools/play.mjs, which
 *      esbuild-bundles them on demand (requires devDependencies).
 *
 * Resolves all paths from this file's own location, so it works from any
 * cwd (that's the point of `npx umeplay`).
 *
 * Subcommands:
 *   umeplay                -- hello (onboarding), falls back to a toy list
 *   umeplay tour           -- auto-play every toy in sequence
 *   umeplay list           -- list every toy
 *   umeplay play [name]    -- list (no name) or launch a toy by name
 *   umeplay workshop       -- pick parts and grow a new toy (repo only)
 *   umeplay new            -- scaffold a new toy (repo only)
 *   umeplay <name>         -- shorthand for `umeplay play <name>`
 *
 * Execution context contract: every child process spawned by this router
 * gets `UMEPLAY_CONTEXT=repo|package` in its environment. "repo" means this
 * is a source checkout (apps/ sources + workspaces package.json present).
 * "package" means this is an installed npm package (npx run, no sources).
 * tools/*.mjs may read this var to phrase guidance as `npm run …` (repo) or
 * `npx umeplay …` (package) instead of hardcoding one form.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);

function detectContext() {
  const appsDir = join(root, "apps");
  const pkgPath = join(root, "package.json");
  if (!existsSync(appsDir) || !existsSync(pkgPath)) return "package";

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return "package";
  }
  if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.some((w) => w.startsWith("apps"))) {
    return "package";
  }

  const hasSource = readdirSync(appsDir).some((n) => existsSync(join(appsDir, n, "src", "cli.ts")));
  return hasSource ? "repo" : "package";
}

const context = detectContext();

// The command form to suggest to the user, adapted to how they're running us.
function playHint(name) {
  return context === "repo" ? `npm run play ${name}` : `npx umeplay ${name}`;
}

function run(scriptPath, args) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
    env: { ...process.env, UMEPLAY_CONTEXT: context },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
  child.on("error", (err) => {
    console.error(`umeplay: failed to run ${scriptPath}: ${err.message}`);
    process.exit(1);
  });
}

function delegateToPlay(args) {
  const playScript = join(root, "tools", "play.mjs");
  if (!existsSync(playScript)) {
    console.error("umeplay: tools/play.mjs not found — this package looks incomplete.");
    process.exit(1);
  }
  run(playScript, args);
}

const distAppsDir = join(root, "dist", "apps");

function prebuiltNames() {
  if (!existsSync(distAppsDir)) return [];
  return readdirSync(distAppsDir)
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.slice(0, -4));
}

// Returns true if it handled (and exited/spawned) the request; false means
// "no prebuilt dist available, caller should fall back".
function runPrebuilt(name, args) {
  const names = prebuiltNames();
  if (names.length === 0) return false;

  const exact = names.find((n) => n === name);
  const hits = exact ? [exact] : names.filter((n) => n.includes(name));

  if (hits.length === 0) {
    console.error(
      `umeplay: "${name}" に一致する app がない。候補:\n` +
        names.map((n) => `  ${playHint(n)}`).join("\n")
    );
    process.exit(1);
  }
  if (hits.length > 1) {
    console.error(`umeplay: "${name}" が曖昧: ${hits.join(", ")}`);
    process.exit(1);
  }
  run(join(distAppsDir, `${hits[0]}.mjs`), args);
  return true;
}

function handlePlayName(name, args) {
  if (runPrebuilt(name, args)) return;
  if (context === "repo") {
    delegateToPlay([name, ...args]);
    return;
  }
  console.error(`umeplay: "${name}" に一致する app が見つからない（prebuilt bundle が無い）。`);
  process.exit(1);
}

function handleList() {
  if (context === "repo") {
    delegateToPlay([]);
    return;
  }
  const names = prebuiltNames();
  if (names.length === 0) {
    console.error("umeplay: 遊べる toy が見つからない（dist/apps が空）。");
    process.exit(1);
  }
  console.log(`おもちゃ箱（${names.length}本）:`);
  for (const n of names) console.log(`  ${playHint(n)}`);
  process.exit(0);
}

function handleHello() {
  const helloScript = join(root, "tools", "hello.mjs");
  if (existsSync(helloScript)) {
    run(helloScript, []);
    return;
  }
  handleList();
}

function handleTour(args) {
  // tour.mjs mirrors play.mjs: it esbuild-bundles apps/*/src/cli.ts on the
  // spot, so it only works in a source checkout. In the published package
  // (no apps/ sources, esbuild not shipped) it would crash instead of
  // running — guard on context rather than mere file existence.
  if (context === "package") {
    console.error("umeplay: tour needs the repo (esbuild + toy sources aren't shipped in the npx package).");
    console.error("");
    console.error("  git clone https://github.com/UMEBOSHIISAN/umeplay.git");
    console.error("  cd umeplay && npm install && npm run tour");
    console.error("");
    console.error("Meanwhile: npx umeplay list / npx umeplay <name>");
    process.exit(1);
  }
  const tourScript = join(root, "tools", "tour.mjs");
  if (existsSync(tourScript)) {
    run(tourScript, args);
    return;
  }
  console.error("umeplay: tour is not available yet in this build.");
  process.exit(1);
}

// workshop/new build new toys from apps/*/src — that only makes sense in a
// source checkout. When run from the published package (no sources), point
// at the repo instead of failing on a missing tools/workshop.mjs.
function handleRepoOnlyTool(name, args) {
  const scriptFile = name === "new" ? "new-toy.mjs" : "workshop.mjs";
  if (context === "repo") {
    const script = join(root, "tools", scriptFile);
    if (existsSync(script)) {
      run(script, args);
      return;
    }
    console.error(`umeplay: tools/${scriptFile} not found in this checkout.`);
    process.exit(1);
  }
  console.log("Building your own toy needs the repo:");
  console.log("");
  console.log("  git clone https://github.com/UMEBOSHIISAN/umeplay.git");
  console.log("  cd umeplay");
  console.log("  npm install");
  console.log(`  npm run ${name}`);
  process.exit(0);
}

if (!cmd) {
  handleHello();
} else if (cmd === "tour") {
  handleTour(rest);
} else if (cmd === "list") {
  handleList();
} else if (cmd === "play") {
  if (rest.length === 0) {
    handleList();
  } else {
    handlePlayName(rest[0], rest.slice(1));
  }
} else if (cmd === "workshop" || cmd === "new") {
  handleRepoOnlyTool(cmd, rest);
} else {
  handlePlayName(cmd, rest);
}
