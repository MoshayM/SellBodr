import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
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
  webServer: [
    {
      command: 'node dist/src/main.js',
      cwd: path.join(projectRoot, 'apps', 'api'),
      port: 4000,
      reuseExistingServer: true,
      timeout: 30_000,
      env: {
        DATABASE_URL: 'file:./dev.db',
        NODE_ENV: 'development',
        API_PORT: '4000',
        JWT_ACCESS_SECRET: 'borderscout-access-secret',
        JWT_REFRESH_SECRET: 'borderscout-refresh-secret',
        JWT_ACCESS_EXPIRY: '3600',
        JWT_REFRESH_EXPIRY: '604800',
        CORS_ORIGIN: 'http://localhost:3000',
      },
    },
    {
      command: 'npx next dev --port 3000',
      cwd: path.join(projectRoot, 'apps', 'web'),
      port: 3000,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:4000/v1',
      },
    },
  ],
});
