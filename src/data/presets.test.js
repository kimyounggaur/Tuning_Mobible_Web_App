import { expect, it } from 'vitest';
import { INSTRUMENTS, resolveTuning, isLowRange, midiToFreq } from './presets.js';
import { midiToNoteName } from '../core/note.js';
import { findClosestString } from '../core/string-match.js';
it.each(INSTRUMENTS.filter((i) => i.tunings.length))('$id MIDI values match every note name', (instrument) => {
  for (const raw of instrument.tunings) {
    const tuning = resolveTuning(raw, instrument.reference);
    for (const string of tuning.strings) expect(midiToNoteName(string.m, false)).toBe(string.n);
  }
});
it.each(INSTRUMENTS.filter((i) => i.reference))('$id shifts every relative string with the reference', (instrument) => {
  const a = resolveTuning(instrument.tunings[0], instrument.reference); const b = resolveTuning(instrument.tunings[0], instrument.reference + 1);
  a.strings.forEach((s, i) => expect(midiToFreq(b.strings[i].m) / midiToFreq(s.m)).toBeCloseTo(2 ** (1 / 12), 8));
  expect(a.provisional).toBe(true); expect(a.source).toBeTruthy();
});
it('uses the documented strict 65Hz low-range threshold', () => {
  expect(isLowRange({ strings: [{ m: 35 }] })).toBe(true);
  expect(isLowRange({ strings: [{ m: 36 }] })).toBe(false);
  expect(isLowRange({ strings: [{ m: 36 }] }, 415)).toBe(true);
});
it.each([1, 2])('matches tightly spaced %s-semitone relative strings', (gap) => {
  const t = resolveTuning({ relative: true, strings: [{ i: 0 }, { i: gap }] }, 60);
  expect(findClosestString(midiToFreq(60 + gap), t).index).toBe(1);
});
