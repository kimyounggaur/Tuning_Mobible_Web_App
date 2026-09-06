import { midiToFreq } from '../data/presets.js';
import { noteToDisplay } from '../core/note.js';
import { stringKey } from '../core/string-match.js';
import { LONG_PRESS_MS } from '../config.js';
import speakerIcon from 'lucide-static/icons/volume-2.svg?raw';
import editIcon from 'lucide-static/icons/pencil.svg?raw';
import { t, getLanguage, tuningName } from '../i18n/index.js';
export { stringKey } from '../core/string-match.js';

export function createStringsPanel({ tuningRow, stringsRoot, onTuningChange, onModeChange, onStringSelect, onToneToggle, onCustom }) {
  let signature = '';
  let cards = [];
  let longTimer;
  let held = false;
  tuningRow.addEventListener('change', (event) => {
    if (event.target.id === 'tuning-select') {
      if (event.target.value === '__custom') onCustom?.();
      else onTuningChange(event.target.value);
    }
  });
  tuningRow.addEventListener('click', (event) => { const button = event.target.closest('[data-mode]'); if (button) onModeChange(button.dataset.mode); if (event.target.closest('#edit-custom')) onCustom?.(true); });
  let tuningTimer;
  tuningRow.addEventListener('pointerdown', (event) => { if (event.target.id === 'edit-custom') tuningTimer = setTimeout(() => onCustom?.(true), LONG_PRESS_MS); });
  for (const event of ['pointerup', 'pointerleave', 'pointercancel']) tuningRow.addEventListener(event, () => clearTimeout(tuningTimer));
  stringsRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button) return;
    const index = Number(button.closest('[data-index]').dataset.index);
    if (button.classList.contains('string-select')) onStringSelect(index);
    else if (!held) onToneToggle(index);
    held = false;
  });
  stringsRoot.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('.tone-button'); if (!button) return;
    held = false;
    longTimer = setTimeout(() => { held = true; onToneToggle(Number(button.closest('[data-index]').dataset.index), true); }, LONG_PRESS_MS);
  });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave']) stringsRoot.addEventListener(name, () => clearTimeout(longTimer));
  function render({ instrument, tuning, mode, selectedIndex, tunedKeys, activeIndex, a4, toneKey }) {
    tuningRow.hidden = !tuning; stringsRoot.hidden = !tuning;
    if (!tuning) { signature = ''; return; }
    const nextSignature = `${getLanguage()}:${instrument.id}:${tuning.id}:${tuning.strings.map((s) => s.m).join(',')}:${instrument.tunings.map((t) => `${t.id}:${t.name}`).join('|')}`;
    if (signature !== nextSignature) {
      signature = nextSignature;
      tuningRow.innerHTML = `<div class="tuning-select-wrap"><select id="tuning-select" aria-label="${t('tuning.select')}"></select></div><div class="segmented mode-toggle" role="radiogroup" aria-label="${t('tuning.mode')}"><button type="button" role="radio" data-mode="auto">${t('auto')}</button><button type="button" role="radio" data-mode="manual">${t('manual')}</button></div>`;
      const select = tuningRow.querySelector('select');
      for (const item of instrument.tunings) select.add(new Option(`${item.custom ? '★ ' : ''}${tuningName(item)}`, item.id));
      select.add(new Option(t('custom'), '__custom'));
      if (tuning.custom) {
        const edit = document.createElement('button'); edit.id = 'edit-custom'; edit.type = 'button'; edit.className = 'icon-button'; edit.setAttribute('aria-label', t('custom.edit')); edit.title = t('custom.edit'); edit.innerHTML = editIcon;
        tuningRow.append(edit);
      }
      stringsRoot.replaceChildren();
      cards = tuning.strings.map((string, index) => {
        const card = document.createElement('div'); card.className = 'string-card'; card.dataset.index = index;
        card.innerHTML = `<button class="string-select" type="button"><span class="string-name"></span><span class="string-freq"></span><span class="string-check" aria-hidden="true"></span></button><button class="tone-button" type="button">${speakerIcon}</button>`;
        const selectButton = card.querySelector('.string-select'); const toneButton = card.querySelector('.tone-button');
        card.querySelector('.string-name').textContent = noteToDisplay(string.n);
        toneButton.setAttribute('aria-label', t('string.tone', { note: string.n })); toneButton.title = t('string.tone', { note: string.n });
        stringsRoot.append(card);
        return { card, selectButton, toneButton, frequency: card.querySelector('.string-freq'), check: card.querySelector('.string-check') };
      });
      stringsRoot.style.setProperty('--string-count', Math.min(tuning.strings.length, 7));
      stringsRoot.classList.toggle('is-many', tuning.strings.length > 7);
      stringsRoot.classList.toggle('has-seven', tuning.strings.length === 7);
    }
    tuningRow.querySelector('select').value = tuning.id;
    tuningRow.querySelectorAll('[data-mode]').forEach((button) => { button.setAttribute('aria-checked', String(button.dataset.mode === mode)); button.tabIndex = button.dataset.mode === mode ? 0 : -1; });
    cards.forEach(({ card, selectButton, toneButton, frequency, check }, index) => {
      const string = tuning.strings[index]; const key = stringKey(string, index);
      const selected = mode === 'manual' && selectedIndex === index;
      card.classList.toggle('is-active', activeIndex === index); card.classList.toggle('is-selected', selected); card.classList.toggle('is-tuned', tunedKeys.has(key));
      selectButton.setAttribute('aria-pressed', String(selected)); toneButton.setAttribute('aria-pressed', String(toneKey === key)); toneButton.classList.toggle('is-playing', toneKey === key);
      const label = `${midiToFreq(string.m, a4).toFixed(1)} Hz`;
      if (frequency.textContent !== label) frequency.textContent = label;
      if (check.textContent !== (tunedKeys.has(key) ? '✓' : '')) check.textContent = tunedKeys.has(key) ? '✓' : '';
    });
  }
  return { render };
}
