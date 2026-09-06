import { afterEach, expect, it, vi } from 'vitest';
import { createSession } from './session.js';
import { createAppState } from './state.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { createViewModel } from './view-model.js';
function harness() {
  const settings = structuredClone(DEFAULT_SETTINGS); const state = createAppState(settings); const view = createViewModel();
  let running = false;
  const engine = { start: vi.fn(async () => { running = true; }), stop: vi.fn(async () => { running = false; }), isRunning: () => running, updateOptions: vi.fn(), pauseAnalysis: vi.fn(), resumeAnalysis: vi.fn(async () => true) };
  const audio = { unlock: vi.fn(async () => {}), suspendContext: vi.fn(async () => {}), onStateChange: () => () => {} };
  const env = { setTimeout, clearTimeout, isSecureContext: true, navigator: { mediaDevices: {} } };
  const session = createSession({ state, settings, view, engine, tonePlayer: { stop() {} }, resetPitch() {}, env, audio });
  return { state, view, engine, audio, session };
}
afterEach(() => vi.useRealTimers());
it('idle -> starting -> listening', async () => { const h = harness(); const start = h.session.startTuning(); expect(h.state.status).toBe('starting'); await start; expect(h.state.status).toBe('listening'); });
it('listening -> idle on stop', async () => { const h = harness(); await h.session.startTuning(); await h.session.stopTuning(); expect(h.state.status).toBe('idle'); expect(h.engine.isRunning()).toBe(false); });
it('hidden pauses without immediate track release', async () => { const h = harness(); await h.session.startTuning(); await h.session.visibility(true); expect(h.state.status).toBe('paused'); expect(h.engine.isRunning()).toBe(true); await h.session.stopTuning(); });
it('hidden ten seconds stops the microphone', async () => { vi.useFakeTimers(); const h = harness(); await h.session.startTuning(); await h.session.visibility(true); await vi.advanceTimersByTimeAsync(10000); expect(h.engine.isRunning()).toBe(false); expect(h.state.status).toBe('paused'); });
it('returns from hidden after resource release', async () => { vi.useFakeTimers(); const h = harness(); await h.session.startTuning(); await h.session.visibility(true); await vi.advanceTimersByTimeAsync(10000); await h.session.visibility(false); expect(h.engine.start).toHaveBeenCalledTimes(2); expect(h.state.started).toBe(true); });
it('ended track -> lost', async () => { const h = harness(); await h.session.startTuning(); h.session.engineState('lost'); expect(h.state.status).toBe('lost'); expect(h.state.started).toBe(false); });
it('permission failure is exposed once', async () => { const h = harness(); h.engine.start.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' })); await h.session.startTuning(); expect(h.view.permission.title).toBe('mic.denied.title'); expect(h.engine.start).toHaveBeenCalledTimes(1); });
it('ignores late start after a stop', async () => { const h = harness(); let finish; h.audio.unlock.mockImplementation(() => new Promise((resolve) => { finish = resolve; })); const start = h.session.startTuning(); await h.session.stopTuning(); finish(); await start; expect(h.state.started).toBe(false); expect(h.engine.start).not.toHaveBeenCalled(); });
