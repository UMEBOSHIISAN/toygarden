function hash(seed: number, x: number, y = 0): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 1D value noise。返値レンジ [0,1]。格子点間は smoothstep(t*t*(3-2t)) 補間 */
export function noise1(seed: number): (x: number) => number {
  return (x) => {
    const x0 = Math.floor(x);
    const t = smoothstep(x - x0);
    return interpolate(hash(seed, x0), hash(seed, x0 + 1), t);
  };
}

/** 2D value noise。bilinear + smoothstep */
export function noise2(seed: number): (x: number, y: number) => number {
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smoothstep(x - x0);
    const ty = smoothstep(y - y0);
    const top = interpolate(hash(seed, x0, y0), hash(seed, x0 + 1, y0), tx);
    const bottom = interpolate(hash(seed, x0, y0 + 1), hash(seed, x0 + 1, y0 + 1), tx);
    return interpolate(top, bottom, ty);
  };
}

/** fractal brownian motion: octaves 個の noise1 を周波数2倍・振幅半減で合成し、振幅合計で正規化して [0,1] を保つ */
export function fbm1(seed: number, octaves: number): (x: number) => number {
  const noise = noise1(seed);
  return (x) => {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let amplitudeTotal = 0;
    for (let octave = 0; octave < octaves; octave += 1) {
      value += noise(x * frequency) * amplitude;
      amplitudeTotal += amplitude;
      frequency *= 2;
      amplitude *= 0.5;
    }
    return value / amplitudeTotal;
  };
}

/** 同上の 2D 版 */
export function fbm2(seed: number, octaves: number): (x: number, y: number) => number {
  const noise = noise2(seed);
  return (x, y) => {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let amplitudeTotal = 0;
    for (let octave = 0; octave < octaves; octave += 1) {
      value += noise(x * frequency, y * frequency) * amplitude;
      amplitudeTotal += amplitude;
      frequency *= 2;
      amplitude *= 0.5;
    }
    return value / amplitudeTotal;
  };
}
