import { expect, it } from 'vitest';
import { saveCustomTuning, loadCustomTunings, deleteCustomTuning } from './custom-tunings.js';
const storage = () => { const map = new Map(); return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
it('creates, restores, edits and deletes a tuning', () => {
  const s = storage(); const collection = {};
  const result = saveCustomTuning(collection, 'guitar', { name: 'My tuning', midis: [36, 43, 48, 53, 57, 62] }, s);
  expect(loadCustomTunings(s).guitar[0]).toEqual(result);
  saveCustomTuning(collection, 'guitar', { id: result.id, name: 'Edited', midis: [35, 43] }, s);
  expect(loadCustomTunings(s).guitar).toHaveLength(1);
  deleteCustomTuning(collection, 'guitar', result.id, s); expect(loadCustomTunings(s).guitar).toEqual([]);
});
it.each([[], [NaN], [0], [120], [40.5]])('rejects invalid MIDI data %j', (midis) => expect(() => saveCustomTuning({}, 'guitar', { name: 'Bad', midis }, storage())).toThrow());
it('does not mutate saved collection when persistence fails', () => {
  const collection = {};
  expect(() => saveCustomTuning(collection, 'guitar', { name: 'Valid', midis: [40] }, { setItem() { throw new Error('Quota'); } })).toThrow();
  expect(collection).toEqual({});
});
