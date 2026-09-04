import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'role-isolated.spec.ts',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['line'],
    ['json', { outputFile: 'artifacts/e2e/role-results.json' }],
    ['html', { outputFolder: 'artifacts/playwright-role-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4273',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/serve-role-artifact.mjs verifier 4273',
      url: 'http://127.0.0.1:4273/fellowship',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node scripts/serve-role-artifact.mjs wallet 4274',
      url: 'http://127.0.0.1:4274/wallet',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node scripts/serve-role-artifact.mjs showcase 4275',
      url: 'http://127.0.0.1:4275/evidence',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
