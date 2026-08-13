import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, 'playwright/.auth/user.json');
const TEST_EMAIL = 'e2e-fixed@borderscout.test';
const TEST_PASSWORD = 'TestPass123!';

setup('create or restore test user session', async ({ page }) => {
  // Try login first (user may already exist from a previous run)
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL);
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const loggedIn = await page
    .waitForURL('**/opportunities', { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  if (!loggedIn) {
    // User doesn't exist yet — register
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await page.getByPlaceholder('John Doe').fill('E2E Tester');
    await page.getByPlaceholder('My eCommerce Store').fill('E2E Test Org');
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('Min. 8 characters').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create free account' }).click();
    await page.waitForURL('**/opportunities', { timeout: 30_000 });
  }

  await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();

  // Save auth state (captures localStorage including bs_access_token)
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
