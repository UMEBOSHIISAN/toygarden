import { describe, it, expect } from "vitest";
import {
  noteToFreq,
  motifForEvent,
  MOTIFS,
  renderPCM,
  encodeWav,
} from "@toygarden/core-chiptune";

describe("notes", () => {
  it("A4 = 440Hz", () => {
    expect(noteToFreq("A4")).toBeCloseTo(440, 5);
  });
  it("C4 ≈ 261.63Hz", () => {
    expect(noteToFreq("C4")).toBeCloseTo(261.63, 1);
  });
  it("throws on bad note", () => {
    expect(() => noteToFreq("H9")).toThrow(/bad note/);
  });
});

describe("motifForEvent", () => {
  it("maps gate.pending / agent.collapse / deploy.success", () => {
    expect(motifForEvent({ kind: "gate.pending", label: "x" })).toBe(MOTIFS.gatePending);
    expect(motifForEvent({ kind: "agent.collapse", agent: "codex", rate: 0.2 })).toBe(
      MOTIFS.collapse,
    );
    expect(motifForEvent({ kind: "deploy.success" })).toBe(MOTIFS.deploySuccess);
  });
  it("returns null for unmapped events", () => {
    expect(motifForEvent({ kind: "task.done", project: "x" })).toBeNull();
  });
});

describe("synth", () => {
  it("renderPCM produces samples", () => {
    const pcm = renderPCM(MOTIFS.gatePending, 8000);
    expect(pcm.length).toBeGreaterThan(0);
  });
  it("encodeWav writes a valid RIFF/WAVE header", () => {
    const wav = encodeWav(renderPCM(MOTIFS.collapse, 8000), 8000);
    const tag = (o: number) => String.fromCharCode(...wav.slice(o, o + 4));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(tag(36)).toBe("data");
  });
});
