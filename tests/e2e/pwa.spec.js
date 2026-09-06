import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fakeBrowser } from './helpers.js';

test('two worker revisions notify, wait for consent and restart offline', async () => {
  test.setTimeout(45000);
  let version = 1;
  const root = path.resolve('dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    try {
      let body = await readFile(file);
      if (pathname === '/sw.js') body = body.toString().replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'tunestring-e2e-${version}';`);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' }); response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await fakeBrowser('sine-82.41');
  try {
    const page = await browser.newPage({ locale: 'ko-KR' }); const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url); await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const precache = await page.evaluate(async () => (await (await caches.open('tunestring-e2e-1')).keys()).map((r) => r.url));
    expect(precache.some((u) => u.includes('pitch-worker'))).toBe(true);
    await page.locator('#start-button').click(); await expect(page.locator('#freq-text')).toContainText('82.4');
    version = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect(page.locator('#update-toast')).toBeVisible();
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'listening');
    expect(await page.evaluate(() => performance.getEntriesByType('navigation')[0].type)).toBe('navigate');
    const reload = page.waitForEvent('load'); await page.locator('#apply-update').click(); await reload;
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'idle');
    expect(await page.evaluate(() => caches.keys())).toEqual(['tunestring-e2e-2']);
    await page.context().setOffline(true); await page.goto(`${url}/uncached-offline-route`);
    await expect(page.locator('#start-button')).toBeVisible(); await page.locator('#start-button').click();
    await expect(page.locator('#freq-text')).toContainText('82.4');
    expect(errors).toEqual([]);
  } finally {
    await browser.close(); await new Promise((resolve) => server.close(resolve));
  }
});
