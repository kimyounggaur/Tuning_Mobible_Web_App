import { expect, it } from 'vitest';
import { createAppState } from './state.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { createViewModel } from './view-model.js';
import { createPitchHandler } from './pitch-handler.js';
import { midiToFreq } from '../core/note.js';
function harness(instrument = 'guitar') {
  const settings = structuredClone(DEFAULT_SETTINGS); settings.selectedInstrumentId = instrument;
  const state = createAppState(settings); state.started = true;
  const view = createViewModel(); let time = 0; let entered = 0;
  const handler = createPitchHandler({ state, settings, view, now: () => time, onInTune: () => entered++ });
  return { state, view, settings, handler, input: (m) => handler.handle({ freq: midiToFreq(m), rms: 0.2, valid: true }), time: (t) => { time = t; }, entered: () => entered };
}
it('locks the first guitar string immediately', () => { const h = harness(); h.input(40); expect(h.state.activeStringIndex).toBe(0); });
it('changes strings after median and three matching candidates', () => { const h = harness(); h.input(40); h.input(40); h.input(40); h.input(45); expect(h.state.activeStringIndex).toBe(0); for (let i = 0; i < 6; i++) h.input(45); expect(h.state.activeStringIndex).toBe(1); });
it('keeps manual string fixed', () => { const h = harness(); h.state.mode = 'manual'; h.state.manualStringIndex = 0; for (let i = 0; i < 10; i++) h.input(45); expect(h.state.activeStringIndex).toBe(0); expect(h.view.note).toBe('E₂'); });
it('locks chromatic notes', () => { const h = harness('chromatic'); h.input(69); h.input(70); expect(h.view.note).toBe('A₄'); for (let i = 0; i < 6; i++) h.input(70); expect(h.view.note).toBe('A#₄'); });
it('rejects out-of-range string matching', () => { const h = harness(); h.input(80); expect(h.view.message).toBe('status.range'); expect(h.state.activeStringIndex).toBeNull(); });
it('debounces silence at 600ms', () => { const h = harness(); h.input(40); h.handler.handle({ silent: true, rms: 0 }); h.time(599); h.handler.handle({ silent: true, rms: 0 }); expect(h.view.freq).not.toBeNull(); h.time(600); h.handler.handle({ silent: true, rms: 0 }); expect(h.view.freq).toBeNull(); });
it('debounces rejection independently', () => { const h = harness(); h.input(40); h.handler.handle({ silent: true, rejected: true }); h.time(400); h.handler.handle({ silent: true, rejected: true }); expect(h.view.message).toBe('status.rejected'); });
it('emits in-tune once per entry', () => { const h = harness(); h.input(40); h.time(500); h.input(40); h.time(700); h.input(40); expect(h.entered()).toBe(1); });
it('ignores output tones and confirmation echoes', () => { const h = harness(); h.view.toneMode = 'reference'; h.input(40); expect(h.view.freq).toBeNull(); h.view.toneMode = null; h.view.ignoreUntil = 200; h.input(40); expect(h.view.freq).toBeNull(); });
it('ignores results while stopped', () => { const h = harness(); h.state.started = false; h.input(40); expect(h.view.freq).toBeNull(); });
it('starts a fresh median window after silence', () => {
  const h = harness(); h.input(40); h.input(40); h.input(40);
  h.handler.handle({ silent: true, rms: 0 }); h.input(45);
  expect(h.view.freq).toBeCloseTo(110, 5);
});
