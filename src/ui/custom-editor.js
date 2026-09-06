import { getTuning } from '../app/state.js';
import { midiToNoteName } from '../core/note.js';
import { saveCustomTuning, deleteCustomTuning } from '../core/custom-tunings.js';
import { createDialog } from './dialog.js';
import minusIcon from 'lucide-static/icons/minus.svg?raw';
import plusIcon from 'lucide-static/icons/plus.svg?raw';
import trashIcon from 'lucide-static/icons/trash-2.svg?raw';
import { t } from '../i18n/index.js';

export function createCustomEditor({ state, actions, app, backdrop }) {
  const sheet = document.querySelector('#custom-sheet'); const root = sheet.querySelector('#custom-strings');
  const name = sheet.querySelector('#custom-name'); const error = sheet.querySelector('#custom-error');
  const remove = sheet.querySelector('#delete-custom'); remove.innerHTML = trashIcon;
  const dialog = createDialog({ sheet, backdrop, app, trigger: document.querySelector('#settings-button'), title: sheet.querySelector('h2'), onClose: actions.save });
  let midis = []; let editingId = null;
  function open(edit = false) {
    const tuning = getTuning(state);
    if (!tuning) return;
    editingId = edit && tuning.custom ? tuning.id : null;
    midis = tuning.strings.map((s) => s.m); name.value = editingId ? tuning.name : '';
    error.hidden = true; remove.hidden = !editingId;
    root.replaceChildren(...midis.map((m, index) => {
      const row = document.createElement('div'); row.className = 'custom-string-row'; row.dataset.index = index;
      row.innerHTML = `<span>${index + 1}</span><button type="button" data-step="-1" class="icon-button" aria-label="${t('string.lower', { number: index + 1 })}">${minusIcon}</button><output>${midiToNoteName(m)}</output><button type="button" data-step="1" class="icon-button" aria-label="${t('string.raise', { number: index + 1 })}">${plusIcon}</button>`;
      return row;
    }));
    dialog.open();
  }
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]'); if (!button) return;
    const row = button.closest('[data-index]'); const index = Number(row.dataset.index);
    midis[index] = Math.max(20, Math.min(83, midis[index] + Number(button.dataset.step)));
    row.querySelector('output').textContent = midiToNoteName(midis[index]);
  });
  const close = dialog.close;
  sheet.querySelector('#close-custom').addEventListener('click', close);
  sheet.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const tuning = saveCustomTuning(state.customTunings, state.selectedInstrumentId, { id: editingId, name: name.value, midis });
      actions.selectTuning(tuning.id); dialog.close();
    } catch { error.hidden = false; error.textContent = t('custom.invalid'); }
  });
  remove.addEventListener('click', () => {
    try { deleteCustomTuning(state.customTunings, state.selectedInstrumentId, editingId); actions.selectTuning('standard'); dialog.close(); }
    catch { error.hidden = false; error.textContent = t('storage.error'); }
  });
  return { open, close };
}
