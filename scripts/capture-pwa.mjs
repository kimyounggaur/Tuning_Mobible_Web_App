import { chromium } from '@playwright/test';
import path from 'node:path';
const url = process.argv[2] ?? 'http://127.0.0.1:5175';
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${path.resolve('tests/fixtures/sine-82.41.wav')}`] });
try {
  for (const [name, width, height, scale] of [['narrow', 360, 640, 3], ['wide', 1280, 720, 1.5]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'ko-KR' });
    await page.goto(`${url}/?nosw`); await page.locator('#start-button').click();
    await page.waitForFunction(() => document.querySelector('.readout').dataset.toneState === 'in');
    await page.screenshot({ path: `public/screenshot-${name}.png` }); await page.close();
  }
} finally { await browser.close(); }
