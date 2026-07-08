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
 *   2. Source checkout — `dist/apps/` is absent (prepack hasn't run yet).
 *      Delegate to tools/play.mjs, which esbuild-bundles
 *      apps/<name>/src/cli.ts on demand (requires devDependencies).
 *
 * Resolves all paths from this file's own location, so it works from any
 * cwd (that's the point of `npx umeplay`).
 */
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);

function run(scriptPath, args) {
  const child = spawn(process.execPath, [scriptPath, ...args], { stdio: "inherit" });
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
      `umeplay: "${name}" に一致する app がない。候補:\n` + names.map((n) => `  ${n}`).join("\n")
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

if (!cmd) {
  const helloScript = join(root, "tools", "hello.mjs");
  if (existsSync(helloScript)) {
    run(helloScript, []);
  } else {
    delegateToPlay([]);
  }
} else if (cmd === "tour") {
  const tourScript = join(root, "tools", "tour.mjs");
  if (existsSync(tourScript)) {
    run(tourScript, rest);
  } else {
    console.error("umeplay: tour is not available yet in this build.");
    process.exit(1);
  }
} else if (!runPrebuilt(cmd, rest)) {
  delegateToPlay([cmd, ...rest]);
}
