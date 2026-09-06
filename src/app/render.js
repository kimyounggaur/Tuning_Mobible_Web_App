// DOM과 표시 상태를 안다. 오디오 계산은 모른다.
// 오디오 콜백 대신 렌더 루프가 이 모듈을 호출한다.
import { INSTRUMENTS } from '../data/presets.js';
import { createGauge, directionForCents } from '../ui/gauge.js';
import { createStringsPanel } from '../ui/strings-panel.js';
import { createDialog, rovingKeys } from '../ui/dialog.js';
import { getInstrument, getTuning } from './state.js';
import { RMS_LEVELS, SR_UPDATE_MS } from '../config.js';
import micIcon from 'lucide-static/icons/mic.svg?raw';
import stopIcon from 'lucide-static/icons/square.svg?raw';
import settingsIcon from 'lucide-static/icons/settings.svg?raw';
import closeIcon from 'lucide-static/icons/x.svg?raw';
import { createCustomEditor } from '../ui/custom-editor.js';
import { createPitchTrace } from '../ui/pitch-trace.js';
import { midiToNoteName } from '../core/note.js';
import { t, setLanguage } from '../i18n/index.js';

export function createRenderer({ state, settings, view, actions }) {
  const els = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));
  const readout = document.querySelector('.readout');
  const gauge = createGauge({ root: els['tuner-gauge'] });
  const dialog = createDialog({ sheet: els['settings-sheet'], backdrop: els['sheet-backdrop'], app: els.app, trigger: els['settings-button'], title: els['settings-title'] });
  const custom = createCustomEditor({ state, actions, app: els.app, backdrop: els['sheet-backdrop'] });
  actions.openCustom = custom.open;
  const trace = createPitchTrace(els['pitch-trace']);
  const stringsPanel = createStringsPanel({ tuningRow: els['tuning-row'], stringsRoot: els['strings-panel'],
    onTuningChange: actions.selectTuning, onModeChange: actions.selectMode, onStringSelect: actions.selectString,
    onToneToggle: actions.toggleReferenceTone, onCustom: (edit) => actions.openCustom?.(edit) });
  let renderedVersion = -1;
  let srTime = -Infinity;
  let srSummary = '';
  let micState = null;
  let instrumentOrder = '';
  function text(id, value) { if (els[id] && els[id].textContent !== value) els[id].textContent = value; }
  function listen(id, type, callback) { els[id]?.addEventListener(type, callback); }
  els['settings-button'].innerHTML = settingsIcon; els['close-settings'].innerHTML = closeIcon;
  listen('start-button', 'click', actions.start); listen('retry-button', 'click', actions.start);
  listen('mic-toggle', 'click', actions.toggleMic);
  listen('settings-button', 'click', dialog.open); listen('close-settings', 'click', dialog.close);
  listen('sheet-backdrop', 'click', () => els['custom-sheet'].hidden ? dialog.close() : custom.close());
  listen('reset-session', 'click', actions.reset);
  listen('apply-update', 'click', actions.applyUpdate); listen('clear-cache', 'click', actions.clearCache);
  text('app-version', `TuneString ${__APP_VERSION__}`); text('build-info', __BUILD_TIME__);
  listen('a4-input', 'change', (event) => actions.updateSetting('a4', event.target.value));
  listen('reset-a4', 'click', () => actions.updateSetting('a4', 440));
  for (const [id, key] of [['confirm-sound-toggle', 'confirmSound'], ['haptic-toggle', 'haptics'], ['octave-tone-toggle', 'octaveToneUp'], ['recent-order-toggle', 'recentOrder'], ['drone-vibrato-toggle', 'droneVibrato'], ['drone-listen-toggle', 'droneListen']]) {
    listen(id, 'change', (event) => actions.updateSetting(key, event.target.checked));
  }
  listen('sensitivity-control', 'click', (event) => { const button = event.target.closest('[data-sensitivity]'); if (button) actions.updateSetting('sensitivity', button.dataset.sensitivity); });
  listen('instrument-chips', 'click', (event) => { const button = event.target.closest('[data-instrument]'); if (button) actions.selectInstrument(button.dataset.instrument); });
  document.addEventListener('keydown', rovingKeys);
  for (const key of ['language', 'theme']) listen(`${key}-select`, 'change', (event) => actions.updateSetting(key, event.target.value));
  const colorScheme = matchMedia('(prefers-color-scheme: dark)');
  colorScheme.addEventListener('change', () => { if (settings.theme === 'system') state.uiVersion += 1; });
  listen('trace-toggle', 'change', (event) => { settings.traceByInstrument[state.selectedInstrumentId] = event.target.checked; actions.save(); });
  listen('reference-note', 'change', (event) => { settings.referenceByInstrument[state.selectedInstrumentId] = Number(event.target.value); actions.reset(); });
  for (let midi = 24; midi <= 72; midi += 1) els['reference-note'].add(new Option(midiToNoteName(midi), midi));
  for (const [id, step] of [['a4-minus', -1], ['a4-plus', 1]]) {
    let delay; let repeat;
    const clear = () => { clearTimeout(delay); clearInterval(repeat); };
    listen(id, 'click', () => actions.updateSetting('a4', settings.a4 + step));
    listen(id, 'pointerdown', () => { delay = setTimeout(() => { repeat = setInterval(() => actions.updateSetting('a4', settings.a4 + step), 100); }, 450); });
    for (const event of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) listen(id, event, clear);
  }
  function renderControls() {
    document.documentElement.lang = setLanguage(settings.language);
    const theme = settings.theme === 'system' ? colorScheme.matches ? 'dark' : 'light' : settings.theme;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f7f9fc' : '#0e1116';
    for (const element of document.querySelectorAll('[data-i18n]')) { const value = t(element.dataset.i18n); if (element.textContent !== value) element.textContent = value; }
    for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
    for (const element of document.querySelectorAll('[data-i18n-title]')) element.title = t(element.dataset.i18nTitle);
    els['language-select'].value = settings.language; els['theme-select'].value = settings.theme;
    const order = settings.recentOrder ? [...INSTRUMENTS].sort((a, b) => {
      const rank = (id) => settings.recentInstruments.includes(id) ? settings.recentInstruments.indexOf(id) : Infinity;
      return rank(a.id) - rank(b.id);
    }) : INSTRUMENTS;
    const signature = `${document.documentElement.lang}:${order.map((i) => i.id).join(',')}`;
    if (signature !== instrumentOrder) {
      instrumentOrder = signature;
      els['instrument-chips'].replaceChildren(...order.map((instrument) => {
        const button = document.createElement('button'); button.className = 'chip'; button.type = 'button';
        button.dataset.instrument = instrument.id; button.setAttribute('role', 'tab'); button.textContent = t(`instrument.${instrument.id}`);
        return button;
      }));
    }
    els['instrument-chips'].querySelectorAll('button').forEach((button) => {
      const selected = button.dataset.instrument === state.selectedInstrumentId;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    if (document.activeElement !== els['a4-input']) els['a4-input'].value = settings.a4;
    for (const [id, key] of [['confirm-sound-toggle', 'confirmSound'], ['haptic-toggle', 'haptics'], ['octave-tone-toggle', 'octaveToneUp'], ['recent-order-toggle', 'recentOrder'], ['drone-vibrato-toggle', 'droneVibrato'], ['drone-listen-toggle', 'droneListen']]) if (els[id]) els[id].checked = settings[key];
    const instrument = getInstrument(state); const tuning = getTuning(state);
    const showTrace = settings.traceByInstrument[instrument.id] ?? ['violin', 'viola', 'cello', 'doublebass', 'haegeum'].includes(instrument.id);
    els['pitch-trace'].hidden = !showTrace; els['trace-toggle'].checked = showTrace;
    els.app.classList.toggle('has-trace', showTrace); els.app.classList.toggle('has-many', (tuning?.strings.length ?? 0) > 7);
    els['provisional-badge'].hidden = !tuning?.provisional;
    els['reference-setting'].hidden = !tuning?.relative;
    if (tuning?.relative) {
      const raw = instrument.tunings.find((item) => item.id === tuning.id);
      const max = 83 - Math.max(...raw.strings.map((s) => s.i));
      [...els['reference-note'].options].forEach((option) => { option.disabled = Number(option.value) > max; });
      els['reference-note'].value = settings.referenceByInstrument[instrument.id] ?? instrument.reference;
      text('tuning-source', t('relative.source'));
    }
    els['sensitivity-control'].querySelectorAll('button').forEach((button) => { const selected = button.dataset.sensitivity === settings.sensitivity; button.setAttribute('aria-checked', String(selected)); button.tabIndex = selected ? 0 : -1; });
    els['calibration-badge'].hidden = settings.a4 === 440; text('calibration-badge', `A=${settings.a4}`);
    els.app.classList.toggle('is-started', state.started || state.status === 'starting');
    els.app.dataset.state = state.status;
    if (micState !== state.started) { micState = state.started; els['mic-toggle'].innerHTML = state.started ? stopIcon : micIcon; }
    els['mic-toggle'].setAttribute('aria-label', t(state.started ? 'stop' : 'start'));
    els['mic-toggle'].setAttribute('aria-pressed', String(state.started)); els['mic-toggle'].title = t(state.started ? 'stop' : 'start');
    els['mic-toggle'].disabled = state.status === 'starting';
    const permission = view.permission;
    els['permission-panel'].hidden = !permission;
    if (permission) {
      text('permission-title', t(permission.title)); text('permission-message', t(permission.body, permission.params));
      els['retry-button'].hidden = !permission.canRetry;
      els['permission-technical'].hidden = !permission.technical;
      els['permission-technical'].querySelector('pre').textContent = permission.technical;
    }
  }
  function render(time) {
    const controlsDirty = renderedVersion !== state.uiVersion;
    if (controlsDirty) { renderControls(); renderedVersion = state.uiVersion; }
    if (view.dirty || controlsDirty) {
      text('note-name', view.note); text('target-text', view.targetFreq === null ? '— Hz' : `${view.targetFreq.toFixed(2)} Hz`);
      text('freq-text', view.freq === null ? '-- Hz' : `${view.freq.toFixed(2)} Hz`);
      const rounded = Math.round(view.cents ?? 0);
      text('cents-text', view.cents === null ? '--¢' : `${rounded > 0 ? '+' : ''}${rounded}¢`);
      text('status-text', t(view.message)); text('direction-text', view.cents === null ? '-' : directionForCents(view.cents, view.toneState));
      readout.dataset.toneState = view.toneState; gauge.update(view.cents);
      const instrument = getInstrument(state);
      stringsPanel.render({ instrument: { ...instrument, tunings: [...instrument.tunings, ...(state.customTunings[instrument.id] ?? [])] }, tuning: getTuning(state), mode: state.mode,
        selectedIndex: state.manualStringIndex, activeIndex: state.activeStringIndex, tunedKeys: state.tunedKeys, a4: settings.a4, toneKey: state.toneKey });
      const level = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(view.rms, 0.000001)) + 60) / 60));
      els['level-fill'].style.transform = `scaleX(${level})`;
      els['level-threshold'].style.left = `${(20 * Math.log10(RMS_LEVELS[settings.sensitivity]) + 60) / 60 * 100}%`;
      els['clipping-badge'].hidden = view.rms < 0.8;
      view.dirty = false;
      trace.draw(view.trace, time, controlsDirty);
    }
    els['complete-banner'].hidden = time >= view.completeUntil;
    readout.classList.toggle('is-pulse', time < view.pulseUntil);
    els['toast'].hidden = time >= view.toastUntil; text('toast', t(view.toast));
    els['update-toast'].hidden = !view.updateReady;
    text('sw-status', t(view.swStatus ?? 'sw.online'));
    if (view.buildInfo) text('build-info', `${view.buildInfo.id} · ${view.buildInfo.time}`);
    const summary = `${view.note}, ${view.cents === null ? t(view.message) : directionForCents(view.cents, view.toneState)}`;
    if (time - srTime >= SR_UPDATE_MS && summary !== srSummary) {
      text('sr-status', summary); srSummary = summary; srTime = time;
      els['tuner-gauge'].setAttribute('aria-label', t('gauge.value', { cents: Math.round(view.cents ?? 0) }));
    }
  }
  function bindLifecycle({ onVisibility, onPageHide, onPageShow }) {
    document.addEventListener('visibilitychange', () => onVisibility(document.hidden));
    window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
    window.addEventListener('beforeunload', onPageHide);
  }
  return { render, tick: gauge.tick, bindLifecycle, dialog, els };
}
