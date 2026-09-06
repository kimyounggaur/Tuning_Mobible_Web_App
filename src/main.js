import './styles.css';
import * as config from './config.js';
import { createPitchEngine } from './audio/pitch-engine.js';
import { createTonePlayer } from './audio/tone-player.js';
import { loadSettings } from './app/settings.js';
import { createAppState } from './app/state.js';
import { createViewModel, setIdle } from './app/view-model.js';
import { createPitchHandler } from './app/pitch-handler.js';
import { createFeedback } from './app/feedback.js';
import { createSession } from './app/session.js';
import { createActions } from './app/actions.js';
import { createRenderer } from './app/render.js';
import { createRenderLoop } from './app/render-loop.js';
import { createPwa } from './app/pwa.js';
import { loadCustomTunings } from './core/custom-tunings.js';
import { setLanguage } from './i18n/index.js';

const settings = loadSettings();
setLanguage(settings.language);
const state = createAppState(settings);
state.customTunings = loadCustomTunings();
const view = createViewModel();
let resumeTimer;
const tonePlayer = createTonePlayer({
  onPlaybackStart: ({ drone } = {}) => { clearTimeout(resumeTimer); if (!(drone && settings.droneListen)) engine.pauseAnalysis(); },
  onPlaybackStop: () => {
    state.toneKey = null; view.toneMode = null; view.rms = 0; state.uiVersion += 1;
    view.ignoreUntil = performance.now() + config.TONE_RESUME_DELAY_MS;
    setIdle(view, state.started ? 'status.listening' : 'status.idle');
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { if (state.started && state.status === 'listening') void engine.resumeAnalysis(); }, config.TONE_RESUME_DELAY_MS);
  },
});
const feedback = createFeedback({ state, settings, view, tonePlayer });
const pitch = createPitchHandler({ state, settings, view, onInTune: feedback });
const engine = createPitchEngine({ onResult: pitch.handle, onState: (status) => session.engineState(status) });
const session = createSession({ state, settings, view, engine, tonePlayer, resetPitch: pitch.reset });
const actions = createActions({ state, settings, view, session, pitch, tonePlayer });
const pwa = createPwa({ view, stopTuning: session.stopTuning });
actions.applyUpdate = pwa.applyUpdate; actions.clearCache = pwa.clearCache;
const renderer = createRenderer({ state, settings, view, actions });
const loop = createRenderLoop(renderer);
actions.syncTarget(); loop.start();
void pwa.register();
void session.preflight();
renderer.bindLifecycle({
  onVisibility: (hidden) => { if (hidden) loop.stop(); else loop.start(); void session.visibility(hidden); },
  onPageHide: () => { loop.stop(); void session.stopTuning(); },
  onPageShow: () => loop.start(),
});
if (import.meta.env.DEV) {
  globalThis.__config = Object.freeze({ ...config });
  globalThis.__gaugeDebug = (cents) => { Object.assign(view, { cents, note: 'A₄', freq: 440, targetFreq: 440, toneState: 'off', dirty: true }); };
}
