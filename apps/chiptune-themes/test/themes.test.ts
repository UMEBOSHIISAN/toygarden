import { describe, it, expect } from "vitest";
import { themeFor } from "../src/index.js";

describe("chiptune-themes", () => {
  it("maps gate.pending to a theme with a valid WAV", () => {
    const theme = themeFor({ kind: "gate.pending", label: "承認待ち" });
    expect(theme).not.toBeNull();
    const tag = String.fromCharCode(...theme!.wav.slice(0, 4));
    expect(tag).toBe("RIFF");
  });

  it("returns null for events with no sound", () => {
    expect(themeFor({ kind: "task.done", project: "投稿" })).toBeNull();
  });

  it("collapse and deploy.success both produce themes", () => {
    expect(themeFor({ kind: "agent.collapse", agent: "codex", rate: 0.2 })).not.toBeNull();
    expect(themeFor({ kind: "deploy.success" })).not.toBeNull();
  });
});
