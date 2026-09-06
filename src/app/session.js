// 상태 전이: idle -> starting(탭) -> listening(권한 획득) <-> paused(숨김/복귀).
// 트랙 ended -> lost -> starting(재시도). 정지/pagehide -> idle. DOM은 모른다.
import { getTuning } from './state.js';
import { setIdle } from './view-model.js';
import { describeMicError } from './permission.js';
import { midiToFreq } from '../data/presets.js';
import { unlock, suspendContext, onStateChange } from '../audio/context.js';
import { RMS_LEVELS, MIN_FREQ, MAX_FREQ, LOW_RANGE_THRESHOLD_HZ, HIDDEN_STOP_MS, WAKE_STATUS_MS, CONTEXT_RESUME_MS } from '../config.js';

export function createSession({ state, settings, view, engine, tonePlayer, resetPitch, env = globalThis, audio = { unlock, suspendContext, onStateChange } }) {
  let generation = 0;
  let hiddenTimer = null;
  let wakeLock = null;
  let desired = false;
  let wakeRetry = false;
  let hidden = false;
  function options() {
    const tuning = getTuning(state);
    if (!tuning) return { lowRange: false, minFreq: MIN_FREQ, maxFreq: MAX_FREQ, rmsMin: RMS_LEVELS[settings.sensitivity] };
    const freqs = tuning.strings.map((s) => midiToFreq(s.m, settings.a4));
    return { lowRange: Math.min(...freqs) < LOW_RANGE_THRESHOLD_HZ,
      minFreq: Math.max(MIN_FREQ, Math.min(...freqs) / 1.5), maxFreq: Math.min(MAX_FREQ, Math.max(...freqs) * 2.2), rmsMin: RMS_LEVELS[settings.sensitivity] };
  }
  async function startTuning() {
    if (state.status === 'starting') return;
    const token = ++generation; desired = true; view.permission = null;
    state.status = 'starting'; state.uiVersion += 1; setIdle(view, 'status.starting');
    try {
      await audio.unlock();
      if (token !== generation) return;
      await engine.start(options());
      if (token !== generation) return;
      state.started = true; state.status = 'listening'; state.uiVersion += 1;
      resetPitch(); setIdle(view, 'status.listening');
      if (hidden) visibility(true);
      else await acquireWakeLock();
    } catch (error) {
      if (token !== generation) return;
      state.started = false; state.status = 'lost'; state.uiVersion += 1;
      view.permission = describeMicError(error, env); setIdle(view, 'status.permission');
    }
  }
  async function stopTuning({ preserveIntent = false } = {}) {
    generation += 1;
    if (!preserveIntent) desired = false;
    env.clearTimeout(hiddenTimer); hiddenTimer = null;
    state.started = false; state.status = preserveIntent ? 'paused' : 'idle'; state.uiVersion += 1;
    tonePlayer.stop(); resetPitch(); view.rms = 0; view.permission = null;
    setIdle(view, preserveIntent ? 'status.resume' : 'status.idle');
    releaseWakeLock(); await engine.stop(); await audio.suspendContext();
  }
  function updateOptions() { engine.updateOptions(options()); }
  async function visibility(isHidden) {
    hidden = isHidden; env.clearTimeout(hiddenTimer);
    if (hidden) tonePlayer.stop();
    if (!desired) { if (hidden) await audio.suspendContext(); return; }
    if (hidden) {
      engine.pauseAnalysis(); releaseWakeLock(); state.status = 'paused';
      setIdle(view, 'status.paused');
      hiddenTimer = env.setTimeout(() => { void stopTuning({ preserveIntent: true }); }, HIDDEN_STOP_MS);
    } else if (!engine.isRunning()) {
      await startTuning();
    } else {
      const token = generation;
      try {
        const resumed = await Promise.race([engine.resumeAnalysis(), new Promise((resolve) => env.setTimeout(() => resolve(false), CONTEXT_RESUME_MS))]);
        if (token !== generation || hidden || !desired) return;
        if (resumed === false) { await engine.stop(); await startTuning(); }
        else { state.status = 'listening'; setIdle(view, 'status.listening'); await acquireWakeLock(); }
      } catch { await engine.stop(); await startTuning(); }
    }
    state.uiVersion += 1;
  }
  function engineState(status) {
    if (status === 'lost') {
      state.started = false; state.status = 'lost'; state.uiVersion += 1;
      tonePlayer.stop(); releaseWakeLock(); setIdle(view, 'status.lost');
    } else if (status === 'muted' && desired) {
      state.status = 'paused'; state.uiVersion += 1; setIdle(view, 'status.muted');
    } else if (status === 'unmuted' && desired && !hidden) { state.status = 'listening'; state.uiVersion += 1; setIdle(view, 'status.listening'); }
  }
  async function acquireWakeLock() {
    if (!env.navigator?.wakeLock || hidden || !desired || wakeLock) return;
    try {
      const lock = await env.navigator.wakeLock.request('screen');
      if (hidden || !desired) { void lock.release(); return; }
      wakeLock = lock;
      lock.addEventListener('release', () => {
        if (wakeLock !== lock) return;
        wakeLock = null;
        if (!hidden && desired && !wakeRetry) { wakeRetry = true; void acquireWakeLock(); }
      });
    } catch { view.toast = 'wake.failed'; view.toastUntil = performance.now() + WAKE_STATUS_MS; view.dirty = true; }
  }
  function releaseWakeLock() { const lock = wakeLock; wakeLock = null; if (lock) void lock.release().catch(() => {}); }
  const unsubscribe = audio.onStateChange((status) => {
    if (desired && !hidden && state.started && ['suspended', 'interrupted'].includes(status)) {
      state.status = 'paused'; setIdle(view, 'status.resume'); state.uiVersion += 1;
      void visibility(false);
    }
  });
  function dispose() { unsubscribe(); return stopTuning(); }
  async function preflight() {
    try {
      const permission = await env.navigator.permissions?.query({ name: 'microphone' });
      if (permission?.state === 'denied' && !state.started && state.status === 'idle') setIdle(view, 'mic.preflight');
    } catch { /* Safari 등 미지원 환경은 정상 시작 흐름을 사용한다. */ }
  }
  return { startTuning, stopTuning, updateOptions, visibility, engineState, dispose, options, preflight };
}
