import { TRACE_SIZE, TRACE_DURATION_MS, GAUGE_MAX_CENTS, IN_TUNE_CENTS } from '../config.js';
export function createPitchTrace(canvas) {
  const context = canvas.getContext('2d');
  let colors = null;
  let cost = 0;
  function draw(trace, now, refreshColors = false) {
    if (canvas.hidden || !context) return;
    const start = performance.now();
    const width = canvas.clientWidth; const height = 56;
    const ratio = globalThis.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    if (!colors || refreshColors) {
      const style = getComputedStyle(canvas); colors = ['--in', '--muted', '--accent'].map((key) => style.getPropertyValue(key).trim());
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    const y = (value) => height / 2 - value / GAUGE_MAX_CENTS * height / 2;
    context.globalAlpha = 0.13; context.fillStyle = colors[0]; context.fillRect(0, y(IN_TUNE_CENTS), width, height * IN_TUNE_CENTS / GAUGE_MAX_CENTS);
    context.globalAlpha = 0.6; context.strokeStyle = colors[1]; context.lineWidth = 1; context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
    context.globalAlpha = 1; context.strokeStyle = colors[2]; context.lineWidth = 2; context.beginPath();
    let connected = false; let lastTime = null;
    for (let i = 0; i < trace.count; i += 1) {
      const index = (trace.head - trace.count + i + TRACE_SIZE) % TRACE_SIZE;
      const age = now - trace.time[index]; const value = trace.cents[index];
      if (age > TRACE_DURATION_MS || !Number.isFinite(value)) { connected = false; continue; }
      const x = width * (1 - age / TRACE_DURATION_MS); const py = y(Math.max(-GAUGE_MAX_CENTS, Math.min(GAUGE_MAX_CENTS, value)));
      if (lastTime !== null && trace.time[index] - lastTime > 100) connected = false;
      if (connected) context.lineTo(x, py); else context.moveTo(x, py);
      connected = true; lastTime = trace.time[index];
    }
    context.stroke(); cost = performance.now() - start;
  }
  return { draw, get cost() { return cost; } };
}
