import { describe, expect, it } from 'vitest';
import { detectPitch } from './pitch-engine.js';
import { noise, pitchCases, sine } from '../test-utils/signals.js';

describe('pitch accuracy', () => {
  it.each(pitchCases())('$label stays within one cent', ({ input, sr, freq }) => {
    const result = detectPitch(input, sr, new Float32Array(1922), 0.008);
    expect(result.valid).toBe(true);
    expect(Math.abs(1200 * Math.log2(result.freq / freq))).toBeLessThanOrEqual(1);
  });
  it('rejects silence', () => expect(detectPitch(new Float32Array(4096), 48000, new Float32Array(1922)).silent).toBe(true));
  it('rejects deterministic broadband noise', () => expect(detectPitch(noise(), 48000, new Float32Array(1922)).valid).toBe(false));
  it('gates immediately below the measured RMS', () => {
    const input = sine(440);
    const rms = Math.sqrt(input.reduce((sum, v) => sum + v * v, 0) / input.length);
    expect(detectPitch(input, 48000, new Float32Array(1922), rms + 0.000001).silent).toBe(true);
    expect(detectPitch(input, 48000, new Float32Array(1922), rms - 0.000001).valid).toBe(true);
  });
});
