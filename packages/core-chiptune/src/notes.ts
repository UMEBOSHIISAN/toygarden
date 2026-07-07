// 音名 → 周波数（A4=440基準・12平均律）。純関数。
const SEMITONES: Record<string, number> = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2,
};

export function noteToFreq(note: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(note);
  if (!m) throw new Error(`bad note: ${note}`);
  const semis = SEMITONES[m[1]] + (Number(m[2]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}
