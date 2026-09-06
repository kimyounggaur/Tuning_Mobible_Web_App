import { expect, it } from 'vitest';
import { freqToMidi, midiToNoteName, noteToDisplay, toSubscript, midiToFreq, centsBetween } from './note.js';
it.each([[440, 69], [82.406889, 40], [27.5, 21]])('maps %s Hz to MIDI %s', (f, m) => expect(freqToMidi(f)).toBeCloseTo(m, 4));
it.each([[0, 'C₋₁'], [69.1, 'A₄'], [69.9, 'A#₄'], [57, 'A₃']])('names MIDI %s', (m, n) => expect(midiToNoteName(m)).toBe(n));
it('formats octave subscripts', () => { expect(noteToDisplay('A#3')).toBe('A#₃'); expect(toSubscript(-1)).toBe('₋₁'); });
it('respects calibration', () => { expect(midiToFreq(69, 442)).toBe(442); expect(centsBetween(880, 440)).toBe(1200); });
