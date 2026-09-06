// 사용자 명령과 주입된 모듈을 연결한다.
// DOM 구조와 피치 분석 내부는 모른다.
import { getTuning, resetSessionProgress } from './state.js';
import { midiToFreq, noteToDisplay, clampIndex } from '../core/note.js';
import { stringKey } from '../core/string-match.js';
import { saveSettings, validateA4 } from './settings.js';
import { setIdle } from './view-model.js';

export function createActions({ state, settings, view, session, pitch, tonePlayer }) {
  function save() {
    Object.assign(settings, { selectedInstrumentId: state.selectedInstrumentId, mode: state.mode, manualStringIndex: state.manualStringIndex, tuningByInstrument: state.tuningByInstrument });
    saveSettings(settings); state.uiVersion += 1; view.dirty = true;
  }
  function syncTarget() {
    const tuning = getTuning(state);
    const index = clampIndex(state.mode === 'manual' ? state.manualStringIndex : state.activeStringIndex ?? 0, tuning?.strings.length ?? 1);
    view.note = tuning ? noteToDisplay(tuning.strings[index].n) : '—';
    view.targetFreq = tuning ? midiToFreq(tuning.strings[index].m, settings.a4) : null;
    setIdle(view, state.started ? 'status.listening' : 'status.idle');
  }
  function reset() { tonePlayer.stop(); resetSessionProgress(state); pitch.reset(); view.completeUntil = 0; syncTarget(); save(); session.updateOptions(); }
  function selectInstrument(id) {
    if (state.selectedInstrumentId === id) return;
    state.selectedInstrumentId = id; state.manualStringIndex = 0;
    settings.recentInstruments = [id, ...settings.recentInstruments.filter((item) => item !== id)];
    if (id === 'chromatic') state.mode = 'auto';
    reset();
  }
  function selectTuning(id) { state.tuningByInstrument[state.selectedInstrumentId] = id; reset(); }
  function selectMode(mode) { state.mode = mode; pitch.reset(); syncTarget(); save(); }
  function selectString(index) { state.mode = 'manual'; state.manualStringIndex = index; state.activeStringIndex = index; pitch.reset(true); syncTarget(); save(); }
  async function toggleReferenceTone(index, drone = false) {
    const tuning = getTuning(state);
    if (!tuning) return;
    const string = tuning.strings[index]; const key = stringKey(string, index);
    const lowRange = session.options().lowRange;
    const freq = midiToFreq(string.m + (lowRange && settings.octaveToneUp ? 12 : 0), settings.a4);
    try {
      const playing = await tonePlayer.play({ freq, key, drone, vibrato: settings.droneVibrato });
      state.toneKey = playing ? key : null; view.toneFreq = freq;
      view.toneMode = playing ? drone ? 'drone' : 'reference' : null;
      if (playing) setIdle(view, drone ? settings.droneListen ? 'status.droneListen' : 'status.drone' : 'status.tone');
    } catch { view.toast = 'mic.unknown.body'; view.toastUntil = performance.now() + 3000; }
    state.uiVersion += 1; view.dirty = true;
  }
  function updateSetting(key, value) {
    if ((key === 'droneListen' || key === 'droneVibrato') && tonePlayer.isPlaying()) tonePlayer.stop();
    settings[key] = key === 'a4' ? validateA4(value) : value;
    if (key === 'a4' || key === 'octaveToneUp') reset();
    if (key === 'sensitivity') session.updateOptions();
    save();
  }
  return { selectInstrument, selectTuning, selectMode, selectString, toggleReferenceTone, updateSetting, reset, syncTarget, save,
    start: () => session.startTuning(), toggleMic: () => state.started ? session.stopTuning() : session.startTuning() };
}
