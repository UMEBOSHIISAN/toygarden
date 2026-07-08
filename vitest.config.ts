import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// 内部 package をソース直参照（build 不要）。tsconfig.base の paths と一致させる。
const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@toygarden/contracts": resolve(root, "contracts/index.ts"),
      "@toygarden/core-events": resolve(root, "packages/core-events/src/index.ts"),
      "@toygarden/core-device": resolve(root, "packages/core-device/src/index.ts"),
      "@toygarden/core-git-observe": resolve(root, "packages/core-git-observe/src/index.ts"),
      "@toygarden/core-chiptune": resolve(root, "packages/core-chiptune/src/index.ts"),
      "@toygarden/core-tui": resolve(root, "packages/core-tui/src/index.ts"),
      "@toygarden/core-worker-data": resolve(root, "packages/core-worker-data/src/index.ts"),
      "@toygarden/core-focus-log": resolve(root, "packages/core-focus-log/src/index.ts"),
      "@toygarden/core-termgif": resolve(root, "packages/core-termgif/src/index.ts"),
      "@toygarden/core-sysmon": resolve(root, "packages/core-sysmon/src/index.ts"),
      "@toygarden/core-save": resolve(root, "packages/core-save/src/index.ts"),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    // node:sqlite は新しい組込みで vite が解決に失敗するため external 指定
    server: { deps: { external: [/node:sqlite/] } },
  },
});
