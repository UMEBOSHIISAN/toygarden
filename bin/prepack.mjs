#!/usr/bin/env node
/**
 * prepack step for `npm pack` / `npm publish`.
 *
 * Bundles every apps/<name>/src/cli.ts into dist/apps/<name>.mjs ahead of
 * time, so the published package doesn't need esbuild/typescript as a
 * runtime dependency (they stay devDependencies). bin/toygarden.mjs looks
 * for these prebuilt files first and only falls back to the on-demand
 * esbuild path (tools/play.mjs) when dist/apps/ is absent.
 *
 * Safe to re-run — each build is deterministic and overwrites its outfile.
 */
import { build } from "esbuild";
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = join(root, "apps");
const outDir = join(root, "dist", "apps");

mkdirSync(outDir, { recursive: true });

const names = readdirSync(appsDir).filter((n) => existsSync(join(appsDir, n, "src", "cli.ts")));

for (const name of names) {
  const entry = join(appsDir, name, "src", "cli.ts");
  const outfile = join(outDir, `${name}.mjs`);
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    tsconfig: join(root, "tsconfig.json"),
    outfile,
    logLevel: "warning",
  });
  console.log(`built ${name} -> dist/apps/${name}.mjs`);
}

console.log(`prepack: ${names.length} app(s) bundled to dist/apps/`);
