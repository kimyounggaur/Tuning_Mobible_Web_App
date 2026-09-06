import { expect, it } from 'vitest';
import { loadSettings, saveSettings } from './settings.js';
import { STORAGE_KEY, LEGACY_STORAGE_KEY } from '../config.js';
const memory = (initial = {}) => { const values = new Map(Object.entries(initial)); return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }; };
it('migrates v1 with typed booleans and A4', () => { const s = memory({ [LEGACY_STORAGE_KEY]: JSON.stringify({ a4: 442, sensitivity: 'high', haptics: false, confirmSound: 'false' }) }); const result = loadSettings(s); expect(result.a4).toBe(442); expect(result.haptics).toBe(false); expect(result.confirmSound).toBe(true); expect(s.getItem(STORAGE_KEY)).not.toBeNull(); });
it('restores instrument, tuning and manual string', () => { const s = memory(); const initial = loadSettings(s); Object.assign(initial, { selectedInstrumentId: 'cello', mode: 'manual', manualStringIndex: 2, tuningByInstrument: { cello: 'standard' } }); saveSettings(initial, s); expect(loadSettings(s)).toEqual(initial); });
it('recovers corrupt storage', () => expect(loadSettings(memory({ [STORAGE_KEY]: 'null' })).a4).toBe(440));
it('clamps calibration and ignores invalid fields', () => { const s = memory({ [STORAGE_KEY]: JSON.stringify({ a4: 900, sensitivity: 'wrong', mode: 'wrong', haptics: 1 }) }); const r = loadSettings(s); expect(r.a4).toBe(466); expect(r.sensitivity).toBe('normal'); expect(r.mode).toBe('auto'); });
it('handles unavailable storage', () => expect(saveSettings({}, { setItem() { throw new Error('quota'); } })).toBe(false));
