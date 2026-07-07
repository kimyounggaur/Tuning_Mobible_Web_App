import { midiToFreq } from '../data/presets.js';

const SPEAKER_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
    <path d="M16 9.5a4 4 0 0 1 0 5" />
    <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
  </svg>
`;

export function createStringsPanel({
  tuningRow,
  stringsRoot,
  onTuningChange,
  onModeChange,
  onStringSelect,
  onToneToggle,
}) {
  function render({ instrument, tuning, mode, selectedIndex, tunedKeys, activeIndex, a4, toneKey }) {
    if (instrument.id === 'chromatic') {
      tuningRow.hidden = true;
      stringsRoot.hidden = true;
      stringsRoot.innerHTML = '';
      return;
    }

    tuningRow.hidden = false;
    stringsRoot.hidden = false;
    renderTuningRow({ instrument, tuning, mode });
    renderStrings({ tuning, selectedIndex, tunedKeys, activeIndex, a4, toneKey });
  }

  function renderTuningRow({ instrument, tuning, mode }) {
    const hasTunings = instrument.tunings.length > 1;
    tuningRow.innerHTML = `
      <div class="tuning-select-wrap" ${hasTunings ? '' : 'hidden'}>
        <select id="tuning-select" aria-label="튜닝 선택">
          ${instrument.tunings.map((item) => `
            <option value="${item.id}" ${item.id === tuning.id ? 'selected' : ''}>${item.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="segmented mode-toggle" role="radiogroup" aria-label="튜닝 모드">
        <button type="button" data-mode="auto" ${mode === 'auto' ? 'aria-checked="true"' : ''}>자동</button>
        <button type="button" data-mode="manual" ${mode === 'manual' ? 'aria-checked="true"' : ''}>수동</button>
      </div>
    `;

    tuningRow.querySelector('#tuning-select')?.addEventListener('change', (event) => {
      onTuningChange(event.target.value);
    });

    tuningRow.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => onModeChange(button.dataset.mode));
    });
  }

  function renderStrings({ tuning, selectedIndex, tunedKeys, activeIndex, a4, toneKey }) {
    stringsRoot.style.setProperty('--string-count', tuning.strings.length);
    stringsRoot.innerHTML = tuning.strings.map((string, index) => {
      const key = stringKey(string, index);
      const isSelected = selectedIndex === index;
      const isActive = activeIndex === index;
      const isTuned = tunedKeys.has(key);
      const isTonePlaying = toneKey === key;
      const freq = midiToFreq(string.m, a4);

      return `
        <div class="string-card ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''} ${isTuned ? 'is-tuned' : ''}" data-index="${index}">
          <button class="string-select" type="button" aria-pressed="${isSelected}" aria-label="${string.n} 현 선택">
            <span class="string-name">${formatNote(string.n)}</span>
            <span class="string-freq">${freq.toFixed(1)} Hz</span>
            <span class="string-check" aria-hidden="true">${isTuned ? '✓' : ''}</span>
          </button>
          <button class="tone-button ${isTonePlaying ? 'is-playing' : ''}" type="button" aria-label="${string.n} 기준음 재생">
            ${SPEAKER_ICON}
          </button>
        </div>
      `;
    }).join('');

    stringsRoot.querySelectorAll('.string-select').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.closest('.string-card').dataset.index);
        onStringSelect(index);
      });
    });

    stringsRoot.querySelectorAll('.tone-button').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.closest('.string-card').dataset.index);
        onToneToggle(index);
      });
    });
  }

  return {
    render,
  };
}

export function stringKey(string, index) {
  return `${index}:${string.n}:${string.m}`;
}

function formatNote(note) {
  return note.replace(/(\d)/g, '<span class="octave">$1</span>');
}
