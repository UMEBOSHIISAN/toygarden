export interface GitCommit {
  hash: string;
  author: string;
  added: number;
  removed: number;
  coauthoredByClaude: boolean;
}

// git log の区切りに使う制御文字（本文に現れない）。observer の format と対で使う。
const SOH = String.fromCharCode(1); // commit の開始
const US = String.fromCharCode(31); // フィールド区切り
const STX = String.fromCharCode(2); // ヘッダ終端（この後に numstat 行が続く）

/** `commitsSince` が要求する `--format` 文字列。parseGitLog と必ずペアで使う。 */
export const GIT_LOG_FORMAT = `${SOH}%H${US}%an${US}%b${STX}`;

/**
 * `git log --numstat --format=GIT_LOG_FORMAT` の出力を GitCommit[] に変換する純関数。
 * 実 git 実行は observer.ts（この関数は文字列→構造体のみ・テスト可能）。
 */
export function parseGitLog(raw: string): GitCommit[] {
  return raw
    .split(SOH)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [header = "", rest = ""] = chunk.split(STX);
      const [hash = "", author = "", body = ""] = header.split(US);
      let added = 0;
      let removed = 0;
      for (const line of rest.split("\n")) {
        const m = /^(\d+|-)\t(\d+|-)\t/.exec(line.trim());
        if (!m) continue;
        if (m[1] !== "-") added += Number(m[1]);
        if (m[2] !== "-") removed += Number(m[2]);
      }
      return {
        hash,
        author,
        added,
        removed,
        coauthoredByClaude: /co-authored-by:.*claude/i.test(body),
      };
    });
}
