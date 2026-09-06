import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 20000, expect: { timeout: 5000 },
  fullyParallel: true, workers: 2, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4273', viewport: { width: 360, height: 640 }, locale: 'ko-KR', trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview -- --port 4273 --strictPort', url: 'http://127.0.0.1:4273', reuseExistingServer: !process.env.CI },
});
