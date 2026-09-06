import { INSTRUMENTS, stringsFromMidi } from '../data/presets.js';
import { CUSTOM_STORAGE_KEY } from '../config.js';

export function loadCustomTunings(storage = globalThis.localStorage) {
  const result = {};
  try {
    const parsed = JSON.parse(storage.getItem(CUSTOM_STORAGE_KEY) ?? '{}');
    for (const instrument of INSTRUMENTS) {
      if (!Array.isArray(parsed?.[instrument.id])) continue;
      result[instrument.id] = parsed[instrument.id].filter((tuning) => typeof tuning?.id === 'string' && tuning.id.startsWith('custom-') && typeof tuning.name === 'string' &&
        Array.isArray(tuning.strings) && tuning.strings.length >= 1 && tuning.strings.length <= 12 &&
        tuning.strings.every((s) => Number.isInteger(s.m) && s.m >= 20 && s.m <= 83))
        .map((tuning) => ({ id: tuning.id, name: tuning.name.slice(0, 40), custom: true, strings: stringsFromMidi(tuning.strings.map((s) => s.m)) }));
    }
  } catch { /* 손상되거나 접근할 수 없는 저장소는 빈 목록으로 시작한다. */ }
  return result;
}
export function saveCustomTuning(collection, instrumentId, { id, name, midis }, storage = globalThis.localStorage) {
  if (!INSTRUMENTS.some((i) => i.id === instrumentId) || !name.trim() || name.trim().length > 40 || !midis.length || midis.length > 12 || !midis.every((m) => Number.isInteger(m) && m >= 20 && m <= 83)) throw new Error('Invalid tuning');
  const tuning = { id: id ?? `custom-${crypto.randomUUID()}`, name: name.trim(), custom: true, strings: stringsFromMidi(midis) };
  const entries = collection[instrumentId] ?? [];
  const next = { ...collection, [instrumentId]: [...entries.filter((item) => item.id !== tuning.id), tuning] };
  storage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next));
  collection[instrumentId] = next[instrumentId];
  return tuning;
}
export function deleteCustomTuning(collection, instrumentId, id, storage = globalThis.localStorage) {
  const next = { ...collection, [instrumentId]: (collection[instrumentId] ?? []).filter((tuning) => tuning.id !== id) };
  storage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next)); collection[instrumentId] = next[instrumentId];
}
