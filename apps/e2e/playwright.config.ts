import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Tests run against the deployed Vercel URL by default.
// Override with PLAYWRIGHT_BASE_URL env var for local dev or preview deployments.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://sellbodr.vercel.app';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: './',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'e2e',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],
  // No webServer — tests run against the deployed Vercel URL directly
});
