import { TRACE_SIZE } from '../config.js';
export function createTrace() {
  const time = new Float64Array(TRACE_SIZE); const cents = new Float32Array(TRACE_SIZE);
  let count = 0; let head = 0;
  return { time, cents, get count() { return count; }, get head() { return head; },
    push(timestamp, value) { time[head] = timestamp; cents[head] = value ?? NaN; head = (head + 1) % TRACE_SIZE; count = Math.min(TRACE_SIZE, count + 1); },
    reset() { count = 0; head = 0; },
  };
}
