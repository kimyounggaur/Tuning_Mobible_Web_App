import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  const svg = await readFile('public/icon-maskable.svg', 'utf8');
  await page.setContent(`<style>html,body{margin:0;width:512px;height:512px}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: 'public/icon-maskable.png' });
} finally { await browser.close(); }
