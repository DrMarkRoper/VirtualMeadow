// Simple value noise with fractal octaves for terrain generation

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const v00 = hash2(ix,     iy);
  const v10 = hash2(ix + 1, iy);
  const v01 = hash2(ix,     iy + 1);
  const v11 = hash2(ix + 1, iy + 1);
  return v00 * (1 - ux) * (1 - uy)
       + v10 * ux * (1 - uy)
       + v01 * (1 - ux) * uy
       + v11 * ux * uy;
}

export function fractalNoise(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let val = 0;
  let amp = 1.0;
  let freq = 1.0;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    max += amp;
    amp  *= gain;
    freq *= lacunarity;
  }
  return val / max;
}

// Seeded random: returns deterministic float [0,1) from index
export function seededRandom(seed, index) {
  const n = Math.sin(seed * 13.1 + index * 127.7 + 19.3) * 43758.5453;
  return n - Math.floor(n);
}
