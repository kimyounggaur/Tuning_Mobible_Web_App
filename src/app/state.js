// 앱 선택 상태와 순수 상태 전이를 안다.
// DOM, 마이크, 저장소는 모른다.
import { INSTRUMENTS, resolveTuning } from '../data/presets.js';
import { clampIndex } from '../core/note.js';
import { RECENT_FREQ_SIZE } from '../config.js';

export function createAppState(settings) {
  return {
    started: false, status: 'idle', selectedInstrumentId: settings.selectedInstrumentId,
    tuningByInstrument: settings.tuningByInstrument, mode: settings.mode, manualStringIndex: settings.manualStringIndex,
    activeStringIndex: null, tunedKeys: new Set(), completeAnnounced: false, toneKey: null,
    recentFreqs: new Float64Array(RECENT_FREQ_SIZE), sortedFreqs: new Float64Array(RECENT_FREQ_SIZE), recentCount: 0, recentIndex: 0,
    lockedMidi: null, noteCandidate: null, noteCandidateCount: 0, stringCandidate: null, stringCandidateCount: 0,
    uiVersion: 0, customTunings: {}, referenceByInstrument: settings.referenceByInstrument,
  };
}
export function getInstrument(state) {
  return INSTRUMENTS.find((instrument) => instrument.id === state.selectedInstrumentId) ?? INSTRUMENTS[0];
}
export function getTuning(state, instrument = getInstrument(state)) {
  if (!instrument.tunings.length) return null;
  const tunings = [...instrument.tunings, ...(state.customTunings[instrument.id] ?? [])];
  return resolveTuning(tunings.find((tuning) => tuning.id === state.tuningByInstrument[instrument.id]) ?? tunings[0], state.referenceByInstrument[instrument.id] ?? instrument.reference);
}
export function resetTracking(state, keepTarget = false) {
  state.recentCount = 0; state.recentIndex = 0;
  state.noteCandidate = null; state.noteCandidateCount = 0;
  state.stringCandidate = null; state.stringCandidateCount = 0;
  if (!keepTarget) { state.lockedMidi = null; state.activeStringIndex = state.mode === 'manual' ? state.manualStringIndex : null; }
}
export function resetSessionProgress(state) {
  state.tunedKeys.clear(); state.completeAnnounced = false;
  const tuning = getTuning(state);
  state.manualStringIndex = clampIndex(state.manualStringIndex, tuning?.strings.length ?? 1);
  resetTracking(state); state.uiVersion += 1;
}
