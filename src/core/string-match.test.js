import { expect, it } from 'vitest';
import { INSTRUMENTS, midiToFreq } from '../data/presets.js';
import { findClosestString } from './string-match.js';
const guitar = INSTRUMENTS[0].tunings[0];
it.each(guitar.strings.flatMap((s, index) => [-40, 0, 40].map((cents) => ({ index, freq: midiToFreq(s.m) * 2 ** (cents / 1200) }))))('matches string $index at $freq', ({ index, freq }) => expect(findClosestString(freq, guitar).index).toBe(index));
it('rejects high-G -120 cents', () => expect(findClosestString(midiToFreq(67) * 2 ** (-120 / 1200), INSTRUMENTS[2].tunings[0])).toBeNull());
it('matches reentrant banjo strings', () => { const t = INSTRUMENTS.find((i) => i.id === 'banjo').tunings[0]; expect(findClosestString(midiToFreq(67), t).index).toBe(0); expect(findClosestString(midiToFreq(62), t).index).toBe(4); });
it('handles missing tuning', () => expect(findClosestString(440, null)).toBeNull());
it('allows unison custom strings without collapsing the match tolerance', () => expect(findClosestString(441, { strings: [{ m: 69 }, { m: 69 }] }).index).toBe(0));
