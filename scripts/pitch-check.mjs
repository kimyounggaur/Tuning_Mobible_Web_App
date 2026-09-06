import { detectPitch } from '../src/audio/pitch-engine.js';
import { pitchCases, sine } from '../src/test-utils/signals.js';
import { decimate } from '../src/audio/detect-pitch.js';
import { INSTRUMENTS, midiToFreq } from '../src/data/presets.js';

const nsdf = new Float32Array(48000 / 25 + 2);
let failures = 0;
const rows = pitchCases().map(({ label, input, freq, sr }) => {
  const result = detectPitch(input, sr, nsdf, 0.008);
  const error = result.valid ? 1200 * Math.log2(result.freq / freq) : NaN;
  const pass = Number.isFinite(error) && Math.abs(error) <= 1;
  if (!pass) failures += 1;
  return { case: label, expected: freq, actual: result.freq?.toFixed(3), cents: error.toFixed(3), result: pass ? 'PASS' : 'FAIL' };
});
console.table(rows);
for (const size of [4096, 8192]) {
  const input = sine(110, size);
  for (let i = 0; i < 10; i += 1) detectPitch(input, 48000, nsdf, 0.008);
  const start = performance.now();
  for (let i = 0; i < 50; i += 1) detectPitch(input, 48000, nsdf, 0.008);
  console.log(`${size}: ${((performance.now() - start) / 50).toFixed(2)} ms/frame`);
}
for (const sr of [48000, 44100]) {
  for (const freq of [30.87, 41.2]) {
    const reduced = decimate(sine(freq, 8192, 0.3, sr), new Float32Array(4096));
    const r = detectPitch(reduced, sr / 2, nsdf, 0.008);
    const cents = Math.abs(1200 * Math.log2(r.freq / freq));
    if (!r.valid || cents > 1) failures += 1;
    console.log(`decimation ${freq} @${sr}: ${r.valid && cents <= 1 ? 'PASS' : 'FAIL'} ${cents.toFixed(3)} cents`);
  }
}
for (const id of ['guitar', 'violin', 'bass']) {
  const instrument = INSTRUMENTS.find((i) => i.id === id);
  const frequencies = instrument.tunings[0].strings.map((s) => midiToFreq(s.m));
  const options = { minFreq: Math.max(25, Math.min(...frequencies) / 1.5), maxFreq: Math.min(1100, Math.max(...frequencies) * 2.2) };
  const sr = instrument.lowRange ? 24000 : 48000;
  const input = sine(frequencies[0], 4096, 0.3, sr);
  for (let i = 0; i < 20; i += 1) detectPitch(input, sr, nsdf, options);
  const start = performance.now();
  for (let i = 0; i < 100; i += 1) detectPitch(input, sr, nsdf, options);
  console.log(`${id}: ${((performance.now() - start) / 100).toFixed(2)} ms/frame (${options.minFreq.toFixed(1)}-${options.maxFreq.toFixed(1)}Hz)`);
}
console.log(`${rows.length + 4 - failures}/${rows.length + 4} passed`);
process.exitCode = failures ? 1 : 0;
