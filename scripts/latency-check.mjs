import { writeFile } from 'node:fs/promises';
import { fakeBrowser, instrumentAudio } from '../tests/e2e/helpers.js';
const browser = await fakeBrowser('sine-41.2');
try {
  const page = await browser.newPage({ locale: 'ko-KR' }); await instrumentAudio(page);
  await page.goto('http://127.0.0.1:5175/?nosw'); await page.locator('[data-instrument="bass"]').click();
  await page.locator('#settings-button').click(); await page.locator('#trace-toggle').check(); await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.__canvasCosts = []; const proto = CanvasRenderingContext2D.prototype; const clear = proto.clearRect; const stroke = proto.stroke;
    let start; let count;
    proto.clearRect = function (...args) { if (this.canvas.id === 'pitch-trace') { start = performance.now(); count = 0; } return clear.apply(this, args); };
    proto.stroke = function (...args) { const result = stroke.apply(this, args); if (this.canvas.id === 'pitch-trace' && ++count === 2) window.__canvasCosts.push(performance.now() - start); return result; };
  });
  await page.locator('#start-button').click();
  await page.waitForFunction(() => window.__workerTimings.length >= 120);
  const result = await page.evaluate(() => {
    const values = window.__workerTimings.slice(5); const average = (key) => values.reduce((sum, value) => sum + value[key], 0) / values.length;
    return { samples: values.length, transferable: window.__transferred, averageLatencyMs: average('elapsed'), averageProcessingMs: average('processing'), desktopCanvasMaxMs: Math.max(0, ...window.__canvasCosts) };
  });
  await writeFile('output/qa/latency.json', JSON.stringify(result, null, 2)); console.log(result);
  if (!result.transferable || result.averageLatencyMs > 40) process.exitCode = 1;
} finally { await browser.close(); }
