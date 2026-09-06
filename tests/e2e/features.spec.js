import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fakeBrowser, instrumentAudio } from './helpers.js';

test('custom tuning survives reload, edits and deletes', async ({ page }) => {
  await page.goto('/?nosw'); await page.locator('#tuning-select').selectOption('__custom');
  await expect(page.locator('#custom-sheet')).toBeVisible();
  await page.locator('#custom-name').fill('Studio tuning'); await page.locator('[data-index="0"] [data-step="-1"]').click();
  await page.locator('#custom-form button[type="submit"]').click();
  await expect(page.locator('#tuning-select')).toContainText('★ Studio tuning');
  await expect(page.locator('.string-card').first()).toContainText('D#₂');
  await page.reload(); await expect(page.locator('.string-card').first()).toContainText('D#₂');
  await page.locator('#edit-custom').click(); await page.locator('#delete-custom').click();
  await expect(page.locator('#tuning-select')).not.toContainText('Studio tuning');
});
test('seven and twelve strings stay reachable on a small phone', async ({ page }) => {
  await page.goto('/?nosw'); await page.locator('#tuning-select').selectOption('7-string');
  await expect(page.locator('.string-card')).toHaveCount(7);
  await page.screenshot({ path: 'output/screens/guitar-7-360x640.png' });
  expect(await page.locator('#app').evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await page.locator('.tone-button').first().evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(48);
  await page.locator('[data-instrument="gayageum"]').click();
  await expect(page.locator('.string-card')).toHaveCount(12); await expect(page.locator('#provisional-badge')).toBeVisible();
  await page.locator('.string-card').last().scrollIntoViewIfNeeded(); await expect(page.locator('.tone-button').last()).toBeInViewport();
  await page.screenshot({ path: 'output/screens/gayageum-12-360x640.png' });
  await page.locator('#settings-button').click(); await page.locator('#reference-note').selectOption('37'); await page.keyboard.press('Escape');
  await expect(page.locator('.string-card').first()).toContainText('C#₂');
});
test('language and light theme persist and pass contrast checks', async ({ page }) => {
  await page.goto('/?nosw'); await page.locator('#settings-button').click();
  await page.locator('#language-select').selectOption('en'); await page.locator('#theme-select').selectOption('light');
  await expect(page.locator('#settings-title')).toHaveText('Settings');
  const settingsAudit = await new AxeBuilder({ page }).analyze();
  expect(settingsAudit.violations.filter((v) => ['serious', 'critical'].includes(v.impact))).toEqual([]);
  await page.keyboard.press('Escape'); await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#start-button')).toHaveText('Start tuning');
  expect(await page.locator('#app').innerText()).not.toMatch(/[가-힣]/);
  await page.screenshot({ path: 'output/screens/english-light-360x640.png' });
  const audit = await new AxeBuilder({ page }).analyze(); expect(audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact))).toEqual([]);
  await page.locator('#settings-button').click(); await page.locator('#language-select').selectOption('ja'); await page.keyboard.press('Escape');
  await expect(page.locator('#start-button')).toHaveText('チューニング開始');
});
test('remembers cello and manual third string with A4 calibration', async ({ page }) => {
  await page.goto('/?nosw'); await page.locator('[data-instrument="cello"]').click(); await page.locator('.string-select').nth(2).click();
  await page.locator('#settings-button').click(); await page.locator('#a4-input').fill('442'); await page.locator('#a4-input').press('Tab'); await page.keyboard.press('Escape');
  await page.reload(); await expect(page.locator('.string-select').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#calibration-badge')).toHaveText('A=442');
  await page.locator('[data-instrument="violin"]').click(); await page.locator('.string-select').nth(2).click();
  await expect(page.locator('#target-text')).toHaveText('442.00 Hz');
});
test('worker analysis, live instrument switch and track-loss recovery', async () => {
  const browser = await fakeBrowser('sine-82.41');
  try {
    const page = await browser.newPage({ locale: 'ko-KR' }); await instrumentAudio(page); await page.goto('http://127.0.0.1:4273/?nosw'); await page.locator('#start-button').click();
    await expect(page.locator('.readout')).toHaveAttribute('data-tone-state', 'in');
    expect(await page.evaluate(() => window.__workers.some((url) => url.includes('pitch-worker')))).toBe(true);
    await page.locator('[data-instrument="bass"]').click(); await page.locator('[data-instrument="guitar"]').click();
    expect(await page.evaluate(() => window.__micCalls)).toBe(1);
    await page.evaluate(() => window.__testStream.getAudioTracks()[0].dispatchEvent(new Event('ended')));
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'lost');
    await page.locator('#start-button').click(); await expect(page.locator('#app')).toHaveAttribute('data-state', 'listening');
    expect(await page.evaluate(() => window.__contextCount)).toBe(1);
  } finally { await browser.close(); }
});
test('worker-unavailable fallback still detects A4', async () => {
  const browser = await fakeBrowser('sine-440');
  try {
    const page = await browser.newPage({ locale: 'ko-KR' }); await page.addInitScript(() => { window.Worker = undefined; });
    await page.goto('http://127.0.0.1:4273/?nosw'); await page.locator('[data-instrument="chromatic"]').click(); await page.locator('#start-button').click();
    await expect(page.locator('#freq-text')).toContainText('440.');
  } finally { await browser.close(); }
});
test('trace draws +20 cents and long press starts a paused drone', async () => {
  const browser = await fakeBrowser('sine-445');
  try {
    const page = await browser.newPage({ locale: 'ko-KR', viewport: { width: 360, height: 640 } }); await page.goto('http://127.0.0.1:4273/?nosw');
    await page.locator('[data-instrument="chromatic"]').click(); await page.locator('#settings-button').click(); await page.locator('#trace-toggle').check(); await page.keyboard.press('Escape');
    await page.locator('#start-button').click(); await expect(page.locator('#cents-text')).toHaveText('+20¢');
    await expect.poll(async () => page.locator('#pitch-trace').evaluate((canvas) => {
      const { data } = canvas.getContext('2d').getImageData(0, 14, canvas.width, 6); let colored = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 100 && data[i + 1] > 160 && data[i + 2] > 200 && data[i + 3] > 100) colored++;
      return colored;
    })).toBeGreaterThan(20);
    await page.screenshot({ path: 'output/screens/trace-20cents.png' });
    await page.locator('[data-instrument="guitar"]').click();
    const button = page.locator('.tone-button').first(); await button.dispatchEvent('pointerdown', { button: 0 }); await page.waitForTimeout(550); await button.dispatchEvent('pointerup');
    await expect(page.locator('#status-text')).toContainText('드론 재생 중'); await expect(page.locator('#freq-text')).toHaveText('-- Hz');
    await button.click(); await button.click(); await expect(button).toHaveAttribute('aria-pressed', 'false');
  } finally { await browser.close(); }
});
