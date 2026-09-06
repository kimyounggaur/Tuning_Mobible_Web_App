import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

for (const [width, height] of [[375, 667], [360, 640], [430, 932], [667, 375], [800, 450], [1024, 768]]) {
  test(`layout ${width}x${height}`, async ({ page }) => {
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height }); await page.goto('/?nosw');
    await expect(page.locator('.string-card')).toHaveCount(6);
    const geometry = await page.evaluate(() => {
      const app = document.querySelector('#app');
      const buttons = [...document.querySelectorAll('.tone-button')].map((el) => { const b = el.getBoundingClientRect(); return { width: b.width, height: b.height, x: b.x, bottom: b.bottom }; });
      const readout = document.querySelector('.readout').getBoundingClientRect();
      const note = document.querySelector('#note-name').getBoundingClientRect();
      return { scroll: app.scrollHeight - app.clientHeight, buttons, readoutTop: readout.top, noteTop: note.top };
    });
    expect(geometry.scroll).toBeLessThanOrEqual(1);
    expect(geometry.noteTop).toBeGreaterThanOrEqual(geometry.readoutTop);
    for (const button of geometry.buttons) { expect(button.bottom).toBeLessThanOrEqual(height); expect(button.height).toBeGreaterThanOrEqual(44); expect(button.x).toBeGreaterThanOrEqual(0); }
    expect(errors).toEqual([]);
    await mkdir('output/screens', { recursive: true }); await page.screenshot({ path: `output/screens/${width}x${height}.png` });
  });
}
test('settings traps focus, escapes and returns focus without aria warnings', async ({ page }) => {
  const warnings = []; page.on('console', (message) => { if (message.text().includes('aria-hidden')) warnings.push(message.text()); });
  await page.goto('/?nosw'); await page.locator('#settings-button').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#settings-title')).toBeFocused();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#clear-cache')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#settings-button')).toBeFocused();
  expect(warnings).toEqual([]);
});
test('dark interface passes axe serious and critical rules', async ({ page }) => {
  await page.goto('/?nosw'); await expect(page.locator('.chip')).not.toHaveCount(0);
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((item) => ['critical', 'serious'].includes(item.impact))).toEqual([]);
});
