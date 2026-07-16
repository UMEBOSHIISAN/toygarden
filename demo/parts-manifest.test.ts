import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type PartManifest = {
  role: string;
  tagline: string;
  taglineJa: string;
  produces: string[];
  consumes: string[];
  status: string;
};

type PackageJson = {
  toygarden?: PartManifest;
};

const VALID_ROLES = ["source", "transform", "view", "voice", "body", "fabric"];
const VALID_STATUSES = ["shipped", "designed", "seed"];
const EVENT_KIND = /^(\*|[a-z]+\.[a-z]+)$/;
const packagesDir = new URL("../packages", import.meta.url).pathname;
const packages = readdirSync(packagesDir)
  .sort()
  .map((dir) => ({ dir, pkgPath: join(packagesDir, dir, "package.json") }))
  .filter(({ pkgPath }) => existsSync(pkgPath))
  .map(({ dir, pkgPath }) => ({
    dir,
    pkg: JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson,
  }));

describe("parts manifest", () => {
  it("exists in every package", () => {
    for (const { dir, pkg } of packages) {
      expect(pkg.toygarden, dir).toBeDefined();
    }
  });

  it("uses a valid role", () => {
    for (const { pkg } of packages) {
      expect(VALID_ROLES).toContain(pkg.toygarden!.role);
    }
  });

  it("has non-empty English and Japanese taglines", () => {
    for (const { pkg } of packages) {
      expect(typeof pkg.toygarden!.tagline).toBe("string");
      expect(pkg.toygarden!.tagline.length).toBeGreaterThan(0);
      expect(typeof pkg.toygarden!.taglineJa).toBe("string");
      expect(pkg.toygarden!.taglineJa.length).toBeGreaterThan(0);
    }
  });

  it("has valid produces and consumes arrays", () => {
    for (const { pkg } of packages) {
      expect(Array.isArray(pkg.toygarden!.produces)).toBe(true);
      expect(Array.isArray(pkg.toygarden!.consumes)).toBe(true);
      for (const kind of [...pkg.toygarden!.produces, ...pkg.toygarden!.consumes]) {
        expect(kind).toMatch(EVENT_KIND);
      }
    }
  });

  it("uses a valid status", () => {
    for (const { pkg } of packages) {
      expect(VALID_STATUSES).toContain(pkg.toygarden!.status);
    }
  });

  it("contains at least 10 parts", () => {
    expect(packages.length).toBeGreaterThanOrEqual(10);
  });
});
