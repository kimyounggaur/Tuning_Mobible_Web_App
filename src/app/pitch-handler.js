// 피치 결과와 악기 상태로 표시 데이터를 계산한다.
// DOM, 햅틱, 오디오 출력은 모른다.
import { centsBetween, midiToFreq, freqToMidi, midiToNoteName, noteToDisplay, clampIndex } from '../core/note.js';
import { findClosestString, stringKey } from '../core/string-match.js';
import { createInTuneTracker } from '../core/in-tune.js';
import { getInstrument, getTuning, resetTracking } from './state.js';
import { setIdle } from './view-model.js';
import { RECENT_FREQ_SIZE, NOTE_LOCK_COUNT, STRING_LOCK_COUNT, SILENCE_DEBOUNCE_MS, REJECT_DEBOUNCE_MS } from '../config.js';

export function createPitchHandler({ state, settings, view, now = () => performance.now(), onInTune = () => {} }) {
  const tracker = createInTuneTracker({ now });
  function reset(keepTarget = false) { resetTracking(state, keepTarget); tracker.reset(); view.trace.reset(); view.silentSince = null; view.rejectedSince = null; }
  function handle(result) {
    if (!state.started || now() < view.ignoreUntil) return;
    if (view.toneMode && !(view.toneMode === 'drone' && settings.droneListen)) return;
    if (view.toneMode === 'drone' && result.freq && Math.abs(centsBetween(result.freq, view.toneFreq)) <= 30) return;
    view.rms = result.rms ?? 0; view.dirty = true;
    if (result.silent || result.valid === false || !Number.isFinite(result.freq)) {
      view.trace.push(now(), null);
      tracker.reset(); state.recentCount = 0; state.recentIndex = 0;
      const field = result.rejected ? 'rejectedSince' : 'silentSince';
      view[result.rejected ? 'silentSince' : 'rejectedSince'] = null;
      if (view[field] === null) view[field] = now();
      const delay = result.rejected ? REJECT_DEBOUNCE_MS : SILENCE_DEBOUNCE_MS;
      if (now() - view[field] >= delay) setIdle(view, result.rejected ? 'status.rejected' : 'status.listening');
      return;
    }
    view.silentSince = null; view.rejectedSince = null;
    const freq = median(result.freq);
    const instrument = getInstrument(state);
    const tuning = getTuning(state);
    let midi;
    let targetKey;
    if (instrument.id === 'chromatic') {
      midi = lock(Math.round(freqToMidi(freq, settings.a4)), 'lockedMidi', 'noteCandidate', 'noteCandidateCount', NOTE_LOCK_COUNT);
      targetKey = `midi:${midi}`; state.activeStringIndex = null; view.note = midiToNoteName(midi);
    } else {
      let index;
      if (state.mode === 'manual') index = clampIndex(state.manualStringIndex, tuning.strings.length);
      else {
        const match = findClosestString(freq, tuning, settings.a4);
        if (!match) { reset(true); state.activeStringIndex = null; setIdle(view, 'status.range'); return; }
        index = lock(match.index, 'activeStringIndex', 'stringCandidate', 'stringCandidateCount', STRING_LOCK_COUNT);
      }
      state.activeStringIndex = index;
      const string = tuning.strings[index]; midi = string.m;
      view.note = noteToDisplay(string.n); targetKey = stringKey(string, index);
    }
    const targetFreq = midiToFreq(midi, settings.a4);
    const cents = centsBetween(freq, targetFreq);
    view.trace.push(now(), cents);
    const resultState = tracker.update(cents, targetKey);
    Object.assign(view, { freq, targetFreq, cents, toneState: resultState.state, message: resultState.state === 'in' ? 'status.intune' : 'status.detecting' });
    if (resultState.entered) onInTune({ targetKey, instrument, tuning });
  }
  function lock(candidate, valueKey, candidateKey, countKey, count) {
    if (state[valueKey] === null) state[valueKey] = candidate;
    if (candidate === state[valueKey]) { state[candidateKey] = null; state[countKey] = 0; }
    else {
      if (state[candidateKey] === candidate) state[countKey] += 1;
      else { state[candidateKey] = candidate; state[countKey] = 1; }
      if (state[countKey] >= count) { state[valueKey] = candidate; state[candidateKey] = null; state[countKey] = 0; }
    }
    return state[valueKey];
  }
  function median(freq) {
    state.recentFreqs[state.recentIndex] = freq;
    state.recentIndex = (state.recentIndex + 1) % RECENT_FREQ_SIZE;
    state.recentCount = Math.min(RECENT_FREQ_SIZE, state.recentCount + 1);
    for (let i = 0; i < state.recentCount; i += 1) {
      let j = i;
      while (j > 0 && state.sortedFreqs[j - 1] > state.recentFreqs[i]) { state.sortedFreqs[j] = state.sortedFreqs[j - 1]; j -= 1; }
      state.sortedFreqs[j] = state.recentFreqs[i];
    }
    return state.sortedFreqs[Math.floor(state.recentCount / 2)];
  }
  return { handle, reset };
}
