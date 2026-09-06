import { mkdir, writeFile } from 'node:fs/promises';
import { sine } from '../src/test-utils/signals.js';
await mkdir('tests/fixtures', { recursive: true });
for (const freq of [440, 82.41, 110, 659.26, 1000, 41.2, 445.1, 0]) {
  const sr = 48000;
  const samples = sine(freq, sr * 4, 0.3, sr);
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => {
    const fade = Math.min(1, i / 240, (samples.length - 1 - i) / 240);
    wav.writeInt16LE(Math.round(sample * fade * 32767), 44 + i * 2);
  });
  await writeFile(`tests/fixtures/${freq ? `sine-${freq === 445.1 ? 445 : freq}` : 'silence'}.wav`, wav);
}
console.log('Generated 8 mono PCM 48kHz WAV fixtures.');
