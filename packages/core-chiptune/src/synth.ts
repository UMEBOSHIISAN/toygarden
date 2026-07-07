import { noteToFreq } from "./notes.js";
import type { Motif } from "./motif.js";

const SAMPLE_RATE = 22050;

/**
 * モチーフを矩形波（8bitらしい音）の PCM(Int16) に合成する純関数。
 * 出力デバイス非依存。再生は play.ts（adapter）。
 */
export function renderPCM(motif: Motif, sampleRate = SAMPLE_RATE): Int16Array {
  const samples: number[] = [];
  const amp = 0.25 * 32767;
  for (const nt of motif.notes) {
    const freq = noteToFreq(nt.note);
    const count = Math.floor((nt.ms / 1000) * sampleRate);
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate;
      const square = Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1;
      samples.push(square * amp);
    }
  }
  return Int16Array.from(samples);
}

/** PCM(Int16 mono) を 44byte ヘッダ付き WAV(Uint8Array) に変換する純関数。 */
export function encodeWav(pcm: Int16Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = pcm.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i], true);
  return new Uint8Array(buffer);
}
