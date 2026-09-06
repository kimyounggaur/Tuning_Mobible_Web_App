export { midiToFreq } from '../data/presets.js';
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SUBSCRIPTS = { '-': '₋', 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };

export const freqToMidi = (freq, a4 = 440) => 69 + 12 * Math.log2(freq / a4);
export const centsBetween = (freq, target) => 1200 * Math.log2(freq / target);
export const toSubscript = (value) => String(value).split('').map((char) => SUBSCRIPTS[char] ?? char).join('');
export const noteToDisplay = (note) => note.replace(/(-?\d+)/, toSubscript);
export const clampIndex = (index, length) => Math.max(0, Math.min(length - 1, index));
export function midiToNoteName(value, subscript = true) {
  const midi = Math.round(value);
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${subscript ? toSubscript(octave) : octave}`;
}
