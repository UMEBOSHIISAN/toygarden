import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// 内部 package をソース直参照（build 不要）。tsconfig.base の paths と一致させる。
const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@umeplay/contracts": resolve(root, "contracts/index.ts"),
      "@umeplay/core-events": resolve(root, "packages/core-events/src/index.ts"),
      "@umeplay/core-device": resolve(root, "packages/core-device/src/index.ts"),
      "@umeplay/core-git-observe": resolve(root, "packages/core-git-observe/src/index.ts"),
      "@umeplay/core-chiptune": resolve(root, "packages/core-chiptune/src/index.ts"),
      "@umeplay/core-tui": resolve(root, "packages/core-tui/src/index.ts"),
      "@umeplay/core-worker-data": resolve(root, "packages/core-worker-data/src/index.ts"),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**"],
  },
});
