import { detectPitch } from '../src/audio/pitch-engine.js';
import { pitchCases, sine } from '../src/test-utils/signals.js';

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
console.log(`${rows.length - failures}/${rows.length} passed`);
process.exitCode = failures ? 1 : 0;
