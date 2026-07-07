const MIN_CENTS = -50;
const MAX_CENTS = 50;
const MIN_ANGLE = -64;
const MAX_ANGLE = 64;
const SMOOTHING = 0.32;

export function createGauge({ root }) {
  const needle = root.querySelector('#gauge-needle');
  const active = root.querySelector('#gauge-active');
  const noteName = document.querySelector('#note-name');
  const targetText = document.querySelector('#target-text');
  const centsText = document.querySelector('#cents-text');
  const freqText = document.querySelector('#freq-text');
  const statusText = document.querySelector('#status-text');
  const directionText = document.querySelector('#direction-text');
  const readout = document.querySelector('.readout');
  let currentAngle = 0;
  let targetAngle = 0;
  let frameId = null;

  function update({ cents, note, freq, targetFreq, state, message }) {
    const clampedCents = clamp(cents ?? 0, MIN_CENTS, MAX_CENTS);
    targetAngle = mapRange(clampedCents, MIN_CENTS, MAX_CENTS, MIN_ANGLE, MAX_ANGLE);
    const toneState = state || stateForCents(cents ?? 0);

    readout.dataset.toneState = toneState;
    active.style.strokeDasharray = `${Math.abs(clampedCents)} 100`;
    active.style.strokeDashoffset = clampedCents < 0 ? '50' : '0';

    if (note) {
      noteName.textContent = note;
    }
    if (Number.isFinite(freq)) {
      freqText.textContent = `${freq.toFixed(2)} Hz`;
    }
    if (Number.isFinite(targetFreq)) {
      targetText.textContent = `${targetFreq.toFixed(2)} Hz`;
    }
    if (Number.isFinite(cents)) {
      centsText.textContent = `${formatSigned(Math.round(cents))}¢`;
      directionText.textContent = directionForCents(cents);
    }
    if (message) {
      statusText.textContent = message;
    }

    ensureAnimation();
  }

  function setIdle(message = '소리를 들려주세요') {
    targetAngle = 0;
    readout.dataset.toneState = 'idle';
    active.style.strokeDasharray = '0 100';
    centsText.textContent = '--¢';
    freqText.textContent = '-- Hz';
    directionText.textContent = '-';
    statusText.textContent = message;
    ensureAnimation();
  }

  function ensureAnimation() {
    if (frameId === null) {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  function tick() {
    currentAngle += (targetAngle - currentAngle) * SMOOTHING;
    needle.style.transform = `rotate(${currentAngle.toFixed(3)}deg)`;

    if (Math.abs(targetAngle - currentAngle) > 0.05) {
      frameId = window.requestAnimationFrame(tick);
    } else {
      currentAngle = targetAngle;
      needle.style.transform = `rotate(${currentAngle.toFixed(3)}deg)`;
      frameId = null;
    }
  }

  return {
    update,
    setIdle,
  };
}

export function stateForCents(cents) {
  const abs = Math.abs(cents);
  if (abs <= 5) {
    return 'in';
  }
  if (abs <= 15) {
    return 'near';
  }
  return 'off';
}

function directionForCents(cents) {
  if (Math.abs(cents) <= 5) {
    return '✓';
  }
  return cents < 0 ? '▼ 낮음' : '▲ 높음';
}

function formatSigned(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
