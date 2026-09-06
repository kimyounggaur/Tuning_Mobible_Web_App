import { expect, it } from 'vitest';
import { createGauge } from './gauge.js';
it.each([[-50, '0', -90], [-20, '-30', -36], [0, '-50', 0], [20, '-50', 36], [50, '-50', 90]])('centers the %s-cent arc and needle', (cents, offset, angle) => {
  const needle = { style: {} }; const arc = { style: {} };
  const gauge = createGauge({ root: { querySelector: (selector) => selector === '#gauge-needle' ? needle : arc } });
  gauge.update(cents); gauge.tick(10000);
  expect(arc.style.strokeDashoffset).toBe(offset);
  expect(arc.style.visibility).toBe(cents ? 'visible' : 'hidden');
  if (angle) expect(needle.style.transform).toBe(`rotate(${angle.toFixed(3)}deg)`);
});
