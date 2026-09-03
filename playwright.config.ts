import { defineConfig } from '@playwright/test'

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['line'],
    ['json', { outputFile: process.env.PLAYWRIGHT_RESULTS_FILE ?? 'artifacts/e2e/results.json' }],
    ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseUrl ? undefined : [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
