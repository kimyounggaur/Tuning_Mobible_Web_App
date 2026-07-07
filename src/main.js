import { createPitchEngine, RMS_LEVELS } from './audio/pitch-engine.js';
import { createTonePlayer } from './audio/tone-player.js';
import { A4_DEFAULT, INSTRUMENTS, midiToFreq } from './data/presets.js';
import { createGauge } from './ui/gauge.js';
import { createStringsPanel, stringKey } from './ui/strings-panel.js';
import './styles.css';

const STORAGE_KEY = 'tunestring-settings-v1';
const RECENT_FREQ_SIZE = 5;
const NOTE_LOCK_COUNT = 3;
const STRING_LOCK_COUNT = 3;
const IN_TUNE_CENTS = 5;
const OUT_OF_TUNE_RELEASE_CENTS = 8;
const IN_TUNE_HOLD_MS = 500;
const TONE_RESUME_DELAY_MS = 300;
const WAKE_STATUS_MS = 3000;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SUBSCRIPT_DIGITS = {
  '-': '₋',
  0: '₀',
  1: '₁',
  2: '₂',
  3: '₃',
  4: '₄',
  5: '₅',
  6: '₆',
  7: '₇',
  8: '₈',
  9: '₉',
};

const DEFAULT_SETTINGS = {
  a4: A4_DEFAULT,
  sensitivity: 'normal',
  confirmSound: true,
  haptics: true,
  octaveToneUp: true,
};

const els = {
  app: document.querySelector('#app'),
  instrumentChips: document.querySelector('#instrument-chips'),
  gauge: document.querySelector('#tuner-gauge'),
  startButton: document.querySelector('#start-button'),
  permissionPanel: document.querySelector('#permission-panel'),
  permissionMessage: document.querySelector('#permission-message'),
  retryButton: document.querySelector('#retry-button'),
  tuningRow: document.querySelector('#tuning-row'),
  stringsPanel: document.querySelector('#strings-panel'),
  completeBanner: document.querySelector('#complete-banner'),
  settingsButton: document.querySelector('#settings-button'),
  settingsSheet: document.querySelector('#settings-sheet'),
  sheetBackdrop: document.querySelector('#sheet-backdrop'),
  closeSettings: document.querySelector('#close-settings'),
  a4Input: document.querySelector('#a4-input'),
  resetA4: document.querySelector('#reset-a4'),
  sensitivityControl: document.querySelector('#sensitivity-control'),
  confirmSoundToggle: document.querySelector('#confirm-sound-toggle'),
  hapticToggle: document.querySelector('#haptic-toggle'),
  octaveToneToggle: document.querySelector('#octave-tone-toggle'),
  wakeStatus: document.querySelector('#wake-status'),
};

const gauge = createGauge({ root: els.gauge });
const settings = loadSettings();
const state = {
  started: false,
  selectedInstrumentId: 'guitar',
  tuningByInstrument: {},
  mode: 'auto',
  manualStringIndex: 0,
  activeStringIndex: null,
  tunedKeys: new Set(),
  completeAnnounced: false,
  recentFreqs: [],
  lockedMidi: null,
  noteCandidate: null,
  noteCandidateCount: 0,
  stringCandidate: null,
  stringCandidateCount: 0,
  inTune: false,
  inTuneSince: null,
  inTuneTargetKey: null,
  toneKey: null,
  wakeLock: null,
  wakeStatusTimer: null,
  lowRangeActive: false,
};

const engine = createPitchEngine({
  onResult: handlePitchResult,
  onError: showPermissionError,
});

const tonePlayer = createTonePlayer({
  onPlaybackStart: () => {
    engine.pauseAnalysis();
  },
  onPlaybackStop: () => {
    window.setTimeout(() => {
      if (state.started && !document.hidden) {
        engine.resumeAnalysis();
      }
    }, TONE_RESUME_DELAY_MS);
  },
});

const stringsPanel = createStringsPanel({
  tuningRow: els.tuningRow,
  stringsRoot: els.stringsPanel,
  onTuningChange: selectTuning,
  onModeChange: selectMode,
  onStringSelect: selectString,
  onToneToggle: toggleReferenceTone,
});

initialize();

function initialize() {
  applySettingsToControls();
  bindEvents();
  renderAll();
  gauge.setIdle('대기 중');
  syncTargetDisplay();
  registerServiceWorker();
}

function bindEvents() {
  els.startButton.addEventListener('click', () => {
    void startTuning();
  });
  els.retryButton.addEventListener('click', () => {
    void startTuning();
  });
  els.settingsButton.addEventListener('click', openSettings);
  els.closeSettings.addEventListener('click', closeSettings);
  els.sheetBackdrop.addEventListener('click', closeSettings);
  els.resetA4.addEventListener('click', () => updateA4(A4_DEFAULT));
  els.a4Input.addEventListener('change', () => updateA4(Number(els.a4Input.value)));
  els.sensitivityControl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sensitivity]');
    if (!button) {
      return;
    }
    settings.sensitivity = button.dataset.sensitivity;
    saveSettings();
    engine.updateOptions({ rmsMin: currentRmsMin() });
    applySettingsToControls();
  });
  els.confirmSoundToggle.addEventListener('change', () => {
    settings.confirmSound = els.confirmSoundToggle.checked;
    saveSettings();
  });
  els.hapticToggle.addEventListener('change', () => {
    settings.haptics = els.hapticToggle.checked;
    saveSettings();
  });
  els.octaveToneToggle.addEventListener('change', () => {
    settings.octaveToneUp = els.octaveToneToggle.checked;
    saveSettings();
    renderStrings();
  });

  document.addEventListener('visibilitychange', () => {
    if (!state.started) {
      return;
    }
    if (document.hidden) {
      engine.pauseAnalysis();
      releaseWakeLock();
      return;
    }
    void engine.resumeAnalysis();
    void acquireWakeLock();
  });
}

async function startTuning() {
  els.permissionPanel.hidden = true;
  els.app.classList.add('is-started');

  try {
    await tonePlayer.unlock();
    await engine.start({
      lowRange: getInstrument().lowRange,
      rmsMin: currentRmsMin(),
    });
    state.started = true;
    state.lowRangeActive = getInstrument().lowRange;
    gauge.setIdle('소리를 들려주세요');
    await acquireWakeLock();
  } catch (error) {
    state.started = false;
    els.app.classList.remove('is-started');
    showPermissionError(error);
  }
}

function handlePitchResult(result) {
  if (!state.started || tonePlayer.isPlaying()) {
    return;
  }

  if (result.silent || !Number.isFinite(result.freq)) {
    resetTracking({ keepTarget: true });
    gauge.setIdle(result.rejected ? '명료한 현 소리가 필요합니다' : '소리를 들려주세요');
    return;
  }

  const freq = pushMedianFreq(result.freq);
  const instrument = getInstrument();
  const tuning = getTuning(instrument);
  let targetFreq = 0;
  let cents = 0;
  let note = '';
  let targetKey = '';
  let stringChanged = false;

  if (instrument.id === 'chromatic') {
    const candidateMidi = Math.round(freqToMidi(freq, settings.a4));
    const midi = updateNoteLock(candidateMidi);
    targetFreq = midiToFreq(midi, settings.a4);
    cents = centsBetween(freq, targetFreq);
    note = midiToNoteName(midi);
    targetKey = `midi:${midi}`;
    if (state.activeStringIndex !== null) {
      state.activeStringIndex = null;
      stringChanged = true;
    }
  } else if (state.mode === 'manual') {
    const index = clampIndex(state.manualStringIndex, tuning.strings.length);
    const targetString = tuning.strings[index];
    targetFreq = midiToFreq(targetString.m, settings.a4);
    cents = centsBetween(freq, targetFreq);
    note = noteToDisplay(targetString.n);
    targetKey = stringKey(targetString, index);
    if (state.activeStringIndex !== index) {
      state.activeStringIndex = index;
      stringChanged = true;
    }
  } else {
    const match = findClosestString(freq, tuning);
    if (!match) {
      resetTracking({ keepTarget: true });
      gauge.setIdle('범위 밖');
      if (state.activeStringIndex !== null) {
        state.activeStringIndex = null;
        renderStrings();
      }
      return;
    }

    const index = updateStringLock(match.index);
    const targetString = tuning.strings[index];
    targetFreq = midiToFreq(targetString.m, settings.a4);
    cents = centsBetween(freq, targetFreq);
    note = noteToDisplay(targetString.n);
    targetKey = stringKey(targetString, index);
    if (state.activeStringIndex !== index) {
      state.activeStringIndex = index;
      stringChanged = true;
    }
  }

  const toneState = updateInTuneState({ cents, targetKey, instrument, tuning });
  gauge.update({
    cents,
    note,
    freq,
    targetFreq,
    state: toneState,
    message: toneState === 'in' ? '맞았습니다' : '감지 중',
  });

  if (stringChanged) {
    renderStrings();
  }
}

function updateInTuneState({ cents, targetKey, instrument, tuning }) {
  const now = performance.now();
  const abs = Math.abs(cents);

  if (state.inTuneTargetKey !== targetKey) {
    state.inTune = false;
    state.inTuneSince = null;
    state.inTuneTargetKey = targetKey;
  }

  if (state.inTune) {
    if (abs > OUT_OF_TUNE_RELEASE_CENTS) {
      state.inTune = false;
      state.inTuneSince = null;
    }
  } else if (abs <= IN_TUNE_CENTS) {
    if (state.inTuneSince === null) {
      state.inTuneSince = now;
    }
    if (now - state.inTuneSince >= IN_TUNE_HOLD_MS) {
      enterInTune({ targetKey, instrument, tuning });
    }
  } else {
    state.inTuneSince = null;
  }

  if (state.inTune) {
    return 'in';
  }
  if (abs <= 15) {
    return 'near';
  }
  return 'off';
}

function enterInTune({ targetKey, instrument, tuning }) {
  state.inTune = true;
  state.inTuneSince = null;
  pulseNote();

  if (settings.haptics) {
    navigator.vibrate?.(60);
  }
  void tonePlayer.beep({ enabled: settings.confirmSound });

  if (instrument.id !== 'chromatic') {
    state.tunedKeys.add(targetKey);
    renderStrings();
    if (!state.completeAnnounced && tuning.strings.every((string, index) => state.tunedKeys.has(stringKey(string, index)))) {
      state.completeAnnounced = true;
      showCompleteBanner();
    }
  }
}

function pulseNote() {
  const readout = document.querySelector('.readout');
  readout.classList.remove('is-pulse');
  window.requestAnimationFrame(() => {
    readout.classList.add('is-pulse');
    window.setTimeout(() => readout.classList.remove('is-pulse'), 560);
  });
}

function showCompleteBanner() {
  els.completeBanner.hidden = false;
  if (settings.haptics) {
    navigator.vibrate?.([55, 60, 55]);
  }
  window.setTimeout(() => {
    els.completeBanner.hidden = true;
  }, 2200);
}

function selectInstrument(id) {
  if (state.selectedInstrumentId === id) {
    return;
  }
  tonePlayer.stop();
  state.selectedInstrumentId = id;
  state.mode = id === 'chromatic' ? 'auto' : state.mode;
  resetSessionProgress();
  renderAll();
  syncTargetDisplay();
  void restartForLowRangeIfNeeded();
}

function selectTuning(id) {
  const instrument = getInstrument();
  state.tuningByInstrument[instrument.id] = id;
  tonePlayer.stop();
  resetSessionProgress();
  renderAll();
  syncTargetDisplay();
}

function selectMode(mode) {
  if (state.mode === mode) {
    return;
  }
  state.mode = mode;
  resetTracking({ keepTarget: false });
  renderAll();
  syncTargetDisplay();
}

function selectString(index) {
  state.mode = 'manual';
  state.manualStringIndex = index;
  state.activeStringIndex = index;
  resetTracking({ keepTarget: true });
  renderAll();
  syncTargetDisplay();
}

async function toggleReferenceTone(index) {
  const instrument = getInstrument();
  const tuning = getTuning(instrument);
  if (!tuning) {
    return;
  }

  const string = tuning.strings[index];
  const key = stringKey(string, index);
  const octaveUp = instrument.lowRange && settings.octaveToneUp;
  const freq = midiToFreq(string.m + (octaveUp ? 12 : 0), settings.a4);
  const playing = await tonePlayer.play({ freq, key });
  state.toneKey = playing ? key : null;
  renderStrings();
}

function renderAll() {
  renderInstrumentChips();
  renderStrings();
  applySettingsToControls();
}

function renderInstrumentChips() {
  els.instrumentChips.innerHTML = INSTRUMENTS.map((instrument) => `
    <button class="chip" type="button" data-instrument="${instrument.id}" aria-selected="${instrument.id === state.selectedInstrumentId}">
      ${instrument.name}
    </button>
  `).join('');

  els.instrumentChips.querySelectorAll('[data-instrument]').forEach((button) => {
    button.addEventListener('click', () => selectInstrument(button.dataset.instrument));
  });
}

function renderStrings() {
  const instrument = getInstrument();
  const tuning = getTuning(instrument);
  stringsPanel.render({
    instrument,
    tuning,
    mode: state.mode,
    selectedIndex: state.manualStringIndex,
    activeIndex: state.activeStringIndex,
    tunedKeys: state.tunedKeys,
    a4: settings.a4,
    toneKey: state.toneKey,
  });
}

function getInstrument() {
  return INSTRUMENTS.find((instrument) => instrument.id === state.selectedInstrumentId) ?? INSTRUMENTS[0];
}

function getTuning(instrument = getInstrument()) {
  if (instrument.id === 'chromatic') {
    return null;
  }
  const savedId = state.tuningByInstrument[instrument.id];
  const selected = instrument.tunings.find((tuning) => tuning.id === savedId);
  return selected ?? instrument.tunings[0];
}

function findClosestString(freq, tuning) {
  let best = null;

  tuning.strings.forEach((string, index) => {
    const target = midiToFreq(string.m, settings.a4);
    const diff = Math.abs(centsBetween(freq, target));
    if (!best || diff < best.diff) {
      best = { index, diff };
    }
  });

  if (!best) {
    return null;
  }

  const bestString = tuning.strings[best.index];
  const nearestNeighbor = tuning.strings.reduce((nearest, string, index) => {
    if (index === best.index) {
      return nearest;
    }
    return Math.min(nearest, Math.abs(string.m - bestString.m) * 100);
  }, Infinity);
  const threshold = Math.min(200, Number.isFinite(nearestNeighbor) ? nearestNeighbor / 2 : 200);

  return best.diff <= threshold ? best : null;
}

function updateNoteLock(candidateMidi) {
  if (state.lockedMidi === null) {
    state.lockedMidi = candidateMidi;
    return state.lockedMidi;
  }
  if (candidateMidi === state.lockedMidi) {
    state.noteCandidate = null;
    state.noteCandidateCount = 0;
    return state.lockedMidi;
  }
  if (state.noteCandidate === candidateMidi) {
    state.noteCandidateCount += 1;
  } else {
    state.noteCandidate = candidateMidi;
    state.noteCandidateCount = 1;
  }
  if (state.noteCandidateCount >= NOTE_LOCK_COUNT) {
    state.lockedMidi = candidateMidi;
    state.noteCandidate = null;
    state.noteCandidateCount = 0;
  }
  return state.lockedMidi;
}

function updateStringLock(candidateIndex) {
  if (state.activeStringIndex === null) {
    state.activeStringIndex = candidateIndex;
    return state.activeStringIndex;
  }
  if (candidateIndex === state.activeStringIndex) {
    state.stringCandidate = null;
    state.stringCandidateCount = 0;
    return state.activeStringIndex;
  }
  if (state.stringCandidate === candidateIndex) {
    state.stringCandidateCount += 1;
  } else {
    state.stringCandidate = candidateIndex;
    state.stringCandidateCount = 1;
  }
  if (state.stringCandidateCount >= STRING_LOCK_COUNT) {
    state.activeStringIndex = candidateIndex;
    state.stringCandidate = null;
    state.stringCandidateCount = 0;
  }
  return state.activeStringIndex;
}

function pushMedianFreq(freq) {
  state.recentFreqs.push(freq);
  if (state.recentFreqs.length > RECENT_FREQ_SIZE) {
    state.recentFreqs.shift();
  }
  const sorted = [...state.recentFreqs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function resetTracking({ keepTarget }) {
  state.recentFreqs = [];
  state.inTune = false;
  state.inTuneSince = null;
  if (!keepTarget) {
    state.lockedMidi = null;
    state.noteCandidate = null;
    state.noteCandidateCount = 0;
    state.activeStringIndex = state.mode === 'manual' ? state.manualStringIndex : null;
    state.stringCandidate = null;
    state.stringCandidateCount = 0;
  }
}

function resetSessionProgress() {
  state.tunedKeys = new Set();
  state.completeAnnounced = false;
  state.completeBanner = false;
  state.activeStringIndex = null;
  state.manualStringIndex = 0;
  resetTracking({ keepTarget: false });
  els.completeBanner.hidden = true;
}

async function restartForLowRangeIfNeeded() {
  const instrument = getInstrument();
  if (!state.started || state.lowRangeActive === instrument.lowRange) {
    return;
  }

  state.lowRangeActive = instrument.lowRange;
  try {
    await engine.restart({
      lowRange: instrument.lowRange,
      rmsMin: currentRmsMin(),
    });
    gauge.setIdle('소리를 들려주세요');
  } catch (error) {
    showPermissionError(error);
  }
}

function updateA4(value) {
  const next = Math.max(415, Math.min(466, Number.isFinite(value) ? Math.round(value) : A4_DEFAULT));
  settings.a4 = next;
  saveSettings();
  applySettingsToControls();
  renderStrings();
  syncTargetDisplay();
}

function applySettingsToControls() {
  els.a4Input.value = String(settings.a4);
  els.confirmSoundToggle.checked = settings.confirmSound;
  els.hapticToggle.checked = settings.haptics;
  els.octaveToneToggle.checked = settings.octaveToneUp;
  els.sensitivityControl.querySelectorAll('[data-sensitivity]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.sensitivity === settings.sensitivity);
    button.setAttribute('aria-checked', String(button.dataset.sensitivity === settings.sensitivity));
  });
}

function syncTargetDisplay() {
  const noteName = document.querySelector('#note-name');
  const targetText = document.querySelector('#target-text');
  const instrument = getInstrument();

  if (instrument.id === 'chromatic') {
    noteName.textContent = `A${toSubscript(4)}`;
    targetText.textContent = `${settings.a4.toFixed(2)} Hz`;
    return;
  }

  const tuning = getTuning(instrument);
  const index = state.mode === 'manual'
    ? clampIndex(state.manualStringIndex, tuning.strings.length)
    : clampIndex(state.activeStringIndex ?? 0, tuning.strings.length);
  const targetString = tuning.strings[index];
  noteName.textContent = noteToDisplay(targetString.n);
  targetText.textContent = `${midiToFreq(targetString.m, settings.a4).toFixed(2)} Hz`;
}

function openSettings() {
  els.settingsSheet.hidden = false;
  els.settingsSheet.setAttribute('aria-hidden', 'false');
  els.sheetBackdrop.hidden = false;
  window.requestAnimationFrame(() => {
    els.settingsSheet.classList.add('is-open');
  });
}

function closeSettings() {
  els.settingsSheet.classList.remove('is-open');
  els.settingsSheet.setAttribute('aria-hidden', 'true');
  els.sheetBackdrop.hidden = true;
  window.setTimeout(() => {
    if (!els.settingsSheet.classList.contains('is-open')) {
      els.settingsSheet.hidden = true;
    }
  }, 240);
}

async function acquireWakeLock() {
  if (!('wakeLock' in navigator) || document.hidden) {
    return;
  }
  try {
    state.wakeLock = await navigator.wakeLock.request('screen');
    showWakeStatus('화면 유지');
    state.wakeLock.addEventListener('release', () => {
      state.wakeLock = null;
    });
  } catch {
    state.wakeLock = null;
  }
}

function releaseWakeLock() {
  if (!state.wakeLock) {
    return;
  }
  void state.wakeLock.release();
  state.wakeLock = null;
}

function showWakeStatus(message) {
  els.wakeStatus.textContent = message;
  els.wakeStatus.classList.add('is-visible');
  window.clearTimeout(state.wakeStatusTimer);
  state.wakeStatusTimer = window.setTimeout(() => {
    els.wakeStatus.classList.remove('is-visible');
  }, WAKE_STATUS_MS);
}

function showPermissionError(error) {
  els.permissionPanel.hidden = false;
  const name = error?.name ?? 'UnknownError';
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const browserHint = isIOS
    ? 'iOS Safari에서는 주소창의 가가 버튼 또는 설정 앱에서 이 사이트의 마이크 권한을 다시 허용하세요.'
    : 'Android Chrome에서는 주소창 왼쪽 사이트 설정에서 마이크 권한을 허용하세요.';
  els.permissionMessage.textContent = `${name}: ${browserHint}`;
  gauge.setIdle('마이크 권한 필요');
}

function currentRmsMin() {
  return RMS_LEVELS[settings.sensitivity] ?? RMS_LEVELS.normal;
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      a4: Number.isFinite(parsed.a4) ? parsed.a4 : DEFAULT_SETTINGS.a4,
      sensitivity: RMS_LEVELS[parsed.sensitivity] ? parsed.sensitivity : DEFAULT_SETTINGS.sensitivity,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function freqToMidi(freq, a4) {
  return 69 + 12 * Math.log2(freq / a4);
}

function centsBetween(freq, targetFreq) {
  return 1200 * Math.log2(freq / targetFreq);
}

function midiToNoteName(midi) {
  const index = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[index]}${toSubscript(octave)}`;
}

function noteToDisplay(note) {
  return note.replace(/(-?\d+)/, (match) => toSubscript(match));
}

function toSubscript(value) {
  return String(value).split('').map((char) => SUBSCRIPT_DIGITS[char] ?? char).join('');
}

function clampIndex(index, length) {
  return Math.max(0, Math.min(length - 1, index));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
