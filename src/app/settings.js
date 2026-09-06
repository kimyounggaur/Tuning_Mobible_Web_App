// 저장된 설정과 검증 규칙을 안다.
// DOM과 오디오 컨텍스트는 모른다.
import { A4_DEFAULT, INSTRUMENTS } from '../data/presets.js';
import { RMS_LEVELS, STORAGE_KEY, LEGACY_STORAGE_KEY } from '../config.js';

export const DEFAULT_SETTINGS = {
  a4: A4_DEFAULT, sensitivity: 'normal', confirmSound: true, haptics: true, octaveToneUp: true,
  selectedInstrumentId: 'guitar', tuningByInstrument: {}, mode: 'auto', manualStringIndex: 0,
  recentOrder: false, recentInstruments: [], traceByInstrument: {},
  language: 'auto', theme: 'dark', droneVibrato: false, droneListen: false, referenceByInstrument: {},
};
export const validateA4 = (value) => Math.max(415, Math.min(466, Number.isFinite(Number(value)) ? Math.round(Number(value)) : A4_DEFAULT));

export function loadSettings(storage = globalThis.localStorage) {
  let parsed;
  try { parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? storage?.getItem(LEGACY_STORAGE_KEY) ?? '{}'); } catch { parsed = {}; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
  const result = structuredClone(DEFAULT_SETTINGS);
  result.a4 = validateA4(parsed.a4 ?? A4_DEFAULT);
  for (const key of ['confirmSound', 'haptics', 'octaveToneUp', 'recentOrder', 'droneVibrato', 'droneListen']) {
    if (typeof parsed[key] === 'boolean') result[key] = parsed[key];
  }
  if (Object.hasOwn(RMS_LEVELS, parsed.sensitivity)) result.sensitivity = parsed.sensitivity;
  if (INSTRUMENTS.some((i) => i.id === parsed.selectedInstrumentId)) result.selectedInstrumentId = parsed.selectedInstrumentId;
  if (['auto', 'manual'].includes(parsed.mode)) result.mode = parsed.mode;
  if (Number.isInteger(parsed.manualStringIndex) && parsed.manualStringIndex >= 0) result.manualStringIndex = Math.min(11, parsed.manualStringIndex);
  for (const key of ['tuningByInstrument', 'traceByInstrument', 'referenceByInstrument']) {
    if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) {
      for (const instrument of INSTRUMENTS) {
        const value = parsed[key][instrument.id];
        if ((key === 'tuningByInstrument' && typeof value === 'string') ||
          (key === 'traceByInstrument' && typeof value === 'boolean') ||
          (key === 'referenceByInstrument' && Number.isInteger(value) && value >= 24 && value <= 72)) result[key][instrument.id] = value;
      }
    }
  }
  if (Array.isArray(parsed.recentInstruments)) result.recentInstruments = [...new Set(parsed.recentInstruments.filter((id) => INSTRUMENTS.some((i) => i.id === id)))];
  if (['auto', 'ko', 'en', 'ja'].includes(parsed.language)) result.language = parsed.language;
  if (['system', 'dark', 'light'].includes(parsed.theme)) result.theme = parsed.theme;
  saveSettings(result, storage);
  return result;
}
export function saveSettings(settings, storage = globalThis.localStorage) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(settings)); return true; } catch { return false; }
}
