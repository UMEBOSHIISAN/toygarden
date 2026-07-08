import { execFileSync } from "node:child_process";
import type { PlayEvent } from "@toygarden/contracts";
import { parseGitLog, GIT_LOG_FORMAT, type GitCommit } from "./parse.js";

/**
 * 実リポジトリの直近コミットを観測（read-only）。外部npm不要（git CLI を child_process 呼び）。
 */
export function commitsSince(dir: string, count = 20): GitCommit[] {
  const raw = execFileSync(
    "git",
    ["-C", dir, "log", `-${count}`, "--numstat", `--format=${GIT_LOG_FORMAT}`],
    { encoding: "utf8" },
  );
  return parseGitLog(raw);
}

/** GitCommit を接続規約の git.commit イベントへ変換（設計 §4.6）。 */
export function toPlayEvents(commits: GitCommit[]): PlayEvent[] {
  return commits.map((c) => ({
    kind: "git.commit" as const,
    added: c.added,
    removed: c.removed,
    coauthoredByClaude: c.coauthoredByClaude,
  }));
}
