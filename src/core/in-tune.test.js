import { expect, it } from 'vitest';
import { createInTuneTracker } from './in-tune.js';
it('enters once after 500ms, holds through 8 cents and releases at 9', () => {
  let time = 0;
  const tracker = createInTuneTracker({ now: () => time });
  expect(tracker.update(5, 'E').entered).toBe(false);
  time = 499; expect(tracker.update(5, 'E').entered).toBe(false);
  time = 500; expect(tracker.update(5, 'E')).toEqual({ state: 'in', entered: true });
  expect(tracker.update(6, 'E')).toEqual({ state: 'in', entered: false });
  expect(tracker.update(8, 'E').state).toBe('in');
  expect(tracker.update(9, 'E').state).toBe('near');
});
it('resets the hold on target change and silence', () => {
  let time = 0;
  const tracker = createInTuneTracker({ now: () => time });
  tracker.update(0, 'E'); time = 500;
  expect(tracker.update(0, 'A').entered).toBe(false);
  time = 1000; expect(tracker.update(0, 'A').entered).toBe(true);
  tracker.reset(); expect(tracker.update(0, 'A').entered).toBe(false);
});
