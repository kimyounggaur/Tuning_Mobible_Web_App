import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

const cases = [
  { fixture: 'sine-440', instrument: 'chromatic', note: 'A₄', cents: 0, freq: 440 },
  { fixture: 'sine-82.41', instrument: 'guitar', note: 'E₂', cents: 0, freq: 82.41, index: 0 },
  { fixture: 'sine-445', instrument: 'chromatic', note: 'A₄', cents: 20, freq: 445.1 },
  { fixture: 'sine-41.2', instrument: 'bass', note: 'E₁', cents: 0, freq: 41.2, index: 0 },
  { fixture: 'sine-659.26', instrument: 'violin', note: 'E₅', cents: 0, freq: 659.26, index: 3 },
  { fixture: 'sine-1000', instrument: 'chromatic', note: 'B₅', cents: 21, freq: 1000 },
];
export async function fakeBrowser(fixture) {
  return chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${path.resolve(`tests/fixtures/${fixture}.wav`)}`] });
}
for (const scenario of cases) {
  test(`microphone ${scenario.fixture} -> ${scenario.instrument}`, async () => {
    const browser = await fakeBrowser(scenario.fixture);
    try {
      const page = await browser.newPage({ viewport: { width: 360, height: 640 }, permissions: ['microphone'], locale: 'ko-KR' });
      await page.goto('http://127.0.0.1:4273/?nosw');
      await page.locator(`[data-instrument="${scenario.instrument}"]`).click();
      await page.locator('#start-button').click();
      await expect(page.locator('#note-name')).toHaveText(scenario.note);
      await expect.poll(async () => parseFloat(await page.locator('#freq-text').textContent())).toBeCloseTo(scenario.freq, 0);
      await expect.poll(async () => Math.abs(parseFloat(await page.locator('#cents-text').textContent()) - scenario.cents)).toBeLessThanOrEqual(2);
      if (scenario.cents === 0) {
        await expect(page.locator('.readout')).toHaveAttribute('data-tone-state', 'in');
        await expect(page.locator('#direction-text')).toHaveText('✓');
      } else {
        await expect(page.locator('#direction-text')).toHaveText('▲ 높음');
      }
      if (scenario.index !== undefined) await expect(page.locator(`.string-card[data-index="${scenario.index}"]`)).toHaveClass(/is-active/);
    } finally { await browser.close(); }
  });
}
test('silence stays idle', async () => {
  const browser = await fakeBrowser('silence');
  try {
    const page = await browser.newPage({ locale: 'ko-KR' });
    await page.goto('http://127.0.0.1:4273/?nosw'); await page.locator('#start-button').click();
    await expect(page.locator('#status-text')).toHaveText('소리를 들려주세요');
    await expect(page.locator('.readout')).toHaveAttribute('data-tone-state', 'idle');
  } finally { await browser.close(); }
});
test('does not request microphone before a gesture', async ({ page }) => {
  await page.addInitScript(() => {
    window.__micCalls = 0;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (...args) => { window.__micCalls += 1; return original(...args); };
  });
  await page.goto('/?nosw');
  await expect(page.locator('#start-button')).toBeVisible();
  expect(await page.evaluate(() => window.__micCalls)).toBe(0);
});
