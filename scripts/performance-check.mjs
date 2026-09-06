import { mkdir, writeFile } from 'node:fs/promises';
import { fakeBrowser, instrumentAudio } from '../tests/e2e/helpers.js';
const browser = await fakeBrowser('sine-41.2');
const result = {};
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, locale: 'ko-KR' }); await instrumentAudio(page);
  await page.goto('http://127.0.0.1:5175/?nosw'); await page.locator('[data-instrument="bass"]').click(); await page.locator('#start-button').click();
  await page.waitForFunction(() => document.querySelector('.readout').dataset.toneState === 'in');
  const cdp = await page.context().newCDPSession(page);
  await page.locator('#mic-toggle').click(); await cdp.send('HeapProfiler.collectGarbage'); const before = await cdp.send('Runtime.getHeapUsage');
  for (let i = 0; i < 20; i += 1) {
    await page.locator('#mic-toggle').click(); await page.waitForFunction(() => document.querySelector('#app').dataset.state === 'listening');
    await page.locator('#mic-toggle').click(); await page.waitForFunction(() => document.querySelector('#app').dataset.state === 'idle');
  }
  await cdp.send('HeapProfiler.collectGarbage'); const after = await cdp.send('Runtime.getHeapUsage');
  result.heapGrowthBytes = after.usedSize - before.usedSize;
  Object.assign(result, await page.evaluate(() => ({ contexts: window.__contextCount, micCalls: window.__micCalls })));
  await page.locator('#settings-button').click(); await page.locator('#trace-toggle').check(); await page.keyboard.press('Escape');
  await page.locator('#mic-toggle').click(); await page.waitForFunction(() => document.querySelector('.readout').dataset.toneState === 'in');
  await page.evaluate(() => {
    window.__qa = { tasks: [], frames: [], srChanges: 0, cardReplacements: 0, canvasCosts: [] };
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__qa.tasks.push(entry.duration); }).observe({ type: 'longtask' });
    new MutationObserver((entries) => { window.__qa.srChanges += entries.length; }).observe(document.querySelector('#sr-status'), { childList: true });
    new MutationObserver((entries) => { window.__qa.cardReplacements += entries.length; }).observe(document.querySelector('#strings-panel'), { childList: true });
    let previous = performance.now();
    const tick = (now) => { window.__qa.frames.push(now - previous); previous = now; window.__qa.frame = requestAnimationFrame(tick); }; window.__qa.frame = requestAnimationFrame(tick);
    const prototype = CanvasRenderingContext2D.prototype; const clear = prototype.clearRect; const stroke = prototype.stroke;
    let start = 0; let strokes = 0;
    prototype.clearRect = function (...args) { if (this.canvas.id === 'pitch-trace') { start = performance.now(); strokes = 0; } return clear.apply(this, args); };
    prototype.stroke = function (...args) { const r = stroke.apply(this, args); if (this.canvas.id === 'pitch-trace' && ++strokes === 2) window.__qa.canvasCosts.push(performance.now() - start); return r; };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(30000);
  const measured = await page.evaluate(() => {
    cancelAnimationFrame(window.__qa.frame); const q = window.__qa; const average = (values) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    return { longTasks: q.tasks.length, longestTaskMs: Math.max(0, ...q.tasks), averageFrameMs: average(q.frames), framesOver50ms: q.frames.filter((n) => n > 50).length, srChanges30s: q.srChanges, cardReplacements30s: q.cardReplacements, canvasAverageMs: average(q.canvasCosts), canvasMaxMs: Math.max(0, ...q.canvasCosts) };
  });
  Object.assign(result, measured); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await mkdir('output/qa', { recursive: true }); await writeFile('output/qa/performance.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  if (result.heapGrowthBytes > 5 * 1024 * 1024 || result.contexts !== 1 || result.longTasks > 0 || result.canvasAverageMs > 2) process.exitCode = 1;
} finally { await browser.close(); }
