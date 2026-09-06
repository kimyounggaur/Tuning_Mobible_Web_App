import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const url = process.argv[2] ?? 'http://127.0.0.1:5175';
await mkdir('output/lighthouse', { recursive: true });
await mkdir('output/lighthouse/profile', { recursive: true });
const chrome = await launch({ chromePath: chromium.executablePath(), userDataDir: path.resolve('output/lighthouse/profile'), chromeFlags: ['--headless', '--no-sandbox'] });
try {
  const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], logLevel: 'error' });
  await writeFile('output/lighthouse/report.html', result.report[0]); await writeFile('output/lighthouse/report.json', result.report[1]);
  const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)]));
  console.log(JSON.stringify({ scores, failingAudits: Object.values(result.lhr.audits).filter((audit) => audit.score !== null && audit.score < 1).map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, description: audit.description })) }, null, 2));
} finally { await chrome.kill(); }
