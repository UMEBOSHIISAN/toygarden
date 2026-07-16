import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const ROLES = ["source", "transform", "view", "voice", "body", "fabric", "unknown"];

export function loadParts(rootDir) {
  const pkgsDir = join(rootDir, "packages");
  const out = [];
  for (const dir of readdirSync(pkgsDir).sort()) {
    const pkgPath = join(pkgsDir, dir, "package.json");
    if (!existsSync(pkgPath)) continue;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      out.push({ name: dir, role: "unknown", tagline: "(broken package.json)", taglineJa: "", produces: [], consumes: [], status: "shipped", dir });
      continue;
    }
    const m = pkg.toygarden;
    if (!m) {
      out.push({ name: dir, role: "unknown", tagline: "(no manifest)", taglineJa: "", produces: [], consumes: [], status: "shipped", dir });
      continue;
    }
    out.push({
      name: dir,
      role: ROLES.includes(m.role) ? m.role : "unknown",
      tagline: typeof m.tagline === "string" ? m.tagline : "",
      taglineJa: typeof m.taglineJa === "string" ? m.taglineJa : "",
      produces: Array.isArray(m.produces) ? m.produces : [],
      consumes: Array.isArray(m.consumes) ? m.consumes : [],
      status: m.status === "designed" || m.status === "seed" ? m.status : "shipped",
      dir,
    });
  }
  return out;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const root = new URL("..", import.meta.url).pathname;
  const parts = loadParts(root);
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(parts, null, 2)}\n`);
  } else {
    for (const role of ROLES) {
      const roleParts = parts.filter((part) => part.role === role);
      if (roleParts.length === 0) continue;
      process.stdout.write(`\x1b[1;36m${role}\x1b[0m\n`);
      for (const part of roleParts) {
        const status = part.status === "shipped" ? part.status : `\x1b[33m${part.status}\x1b[0m`;
        process.stdout.write(`  ${part.name} — ${part.tagline} (${status})\n`);
      }
    }
  }
}
