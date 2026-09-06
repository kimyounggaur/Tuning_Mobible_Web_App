import { GAUGE_MAX_CENTS, GAUGE_MAX_ANGLE, GAUGE_SMOOTHING_MS, IN_TUNE_CENTS, NEAR_CENTS } from '../config.js';
import { t } from '../i18n/index.js';

export function createGauge({ root }) {
  const needle = root.querySelector('#gauge-needle');
  const active = root.querySelector('#gauge-active');
  let currentAngle = 0;
  let targetAngle = 0;
  function update(cents) {
    const clamped = Math.max(-GAUGE_MAX_CENTS, Math.min(GAUGE_MAX_CENTS, cents ?? 0));
    targetAngle = clamped / GAUGE_MAX_CENTS * GAUGE_MAX_ANGLE;
    active.style.strokeDasharray = `${Math.abs(clamped)} 100`;
    active.style.strokeDashoffset = String(clamped >= 0 ? -50 : Math.abs(clamped) - 50);
    active.style.visibility = !clamped || cents === null ? 'hidden' : 'visible';
  }
  function tick(dt) {
    if (currentAngle === targetAngle) return;
    currentAngle += (targetAngle - currentAngle) * (1 - Math.exp(-dt / GAUGE_SMOOTHING_MS));
    if (Math.abs(currentAngle - targetAngle) < 0.05) currentAngle = targetAngle;
    needle.style.transform = `rotate(${currentAngle.toFixed(3)}deg)`;
  }
  return { update, tick };
}
export function stateForCents(cents) { return Math.abs(cents) <= IN_TUNE_CENTS ? 'in' : Math.abs(cents) <= NEAR_CENTS ? 'near' : 'off'; }
export function directionForCents(cents, state) { return state === 'in' ? '✓' : Math.abs(cents) <= IN_TUNE_CENTS ? '✓' : cents < 0 ? t('direction.low') : t('direction.high'); }
