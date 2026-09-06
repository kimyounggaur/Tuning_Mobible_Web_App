export const sine = (freq, size = 4096, amp = 0.3, sr = 48000) =>
  Float32Array.from({ length: size }, (_, i) => amp * Math.sin(2 * Math.PI * freq * i / sr));

export const saw = (freq, size = 4096, amp = 0.3, sr = 48000) =>
  Float32Array.from({ length: size }, (_, i) => {
    let value = 0;
    for (let harmonic = 1; harmonic <= 12; harmonic += 1) {
      value += Math.sin(2 * Math.PI * freq * harmonic * i / sr) / harmonic;
    }
    return amp * value * 0.6;
  });

export const guitarLike = (freq, size = 4096, amp = 0.3, sr = 48000) =>
  Float32Array.from({ length: size }, (_, i) => amp * [0.5, 1, 0.6, 0.35, 0.2, 0.1]
    .reduce((sum, gain, index) => sum + gain * Math.sin(2 * Math.PI * freq * (index + 1) * i / sr), 0) / 2.75);

export function noise(size = 4096, amp = 0.3) {
  let seed = 12345;
  return Float32Array.from({ length: size }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return amp * (seed / 0x100000000 * 2 - 1);
  });
}

export function pitchCases() {
  const cases = [];
  for (const sr of [48000, 44100]) {
    for (const freq of [25, 30.87, 41.2, 65.41, 82.41, 110, 220, 440, 659.26, 800, 830, 880, 1000, 1046.5, 1100]) {
      cases.push({ label: `sine ${freq} @${sr}`, input: sine(freq, 4096, 0.3, sr), freq, sr });
    }
    for (const freq of [82.41, 110, 196, 440]) {
      cases.push({ label: `saw ${freq} @${sr}`, input: saw(freq, 4096, 0.3, sr), freq, sr });
    }
    for (const freq of [82.41, 41.2]) {
      for (const size of [4096, 8192]) {
        cases.push({ label: `guitar ${freq}/${size} @${sr}`, input: guitarLike(freq, size, 0.3, sr), freq, sr });
      }
    }
    for (const freq of [82.41, 440]) {
      cases.push({ label: `DC ${freq} @${sr}`, input: sine(freq, 4096, 0.3, sr).map((v) => v + 0.2), freq, sr });
    }
  }
  return cases;
}
