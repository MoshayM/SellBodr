import { test, expect } from '@playwright/test';

// These tests bypass saved auth state to test fresh authentication flows
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('BorderScout AI')).toBeVisible();
    await expect(page.getByText('Find Products in India. Sell Globally.')).toBeVisible();
  });

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create free account' })).toBeVisible();
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
    await expect(page.getByPlaceholder('My eCommerce Store')).toBeVisible();
  });

  test('register → links to login page', async ({ page }) => {
    await page.goto('/register');
    await page.getByText('Sign in').click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('login → links to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Create one free').click();
    await page.waitForURL('**/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  });

  test('register new user → redirects to /opportunities', async ({ page }) => {
    const ts = String(Math.floor(Math.random() * 999999));
    const email = `reg-${ts}@e2e.test`;

    await page.goto('/register');
    await page.getByPlaceholder('John Doe').fill('New User');
    await page.getByPlaceholder('My eCommerce Store').fill(`Org ${ts}`);
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Min. 8 characters').fill('TestPass123!');
    await page.getByRole('button', { name: 'Create free account' }).click();

    await page.waitForURL('**/opportunities', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();
  });

  test('login with valid credentials → redirects to /opportunities', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@borderscout.test');
    await page.getByPlaceholder('••••••••').fill('TestPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('**/opportunities', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
  });

  test('login with wrong password → API returns 401 and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@borderscout.test');
    await page.getByPlaceholder('••••••••').fill('WrongPassword999!');

    // Intercept response before clicking to avoid race condition
    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);

    // API returns 401 for wrong password; api.ts redirects back to /login on 401
    expect(loginResponse.status()).toBe(401);
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('login with unknown email → API returns 401 and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('nobody-unknown-xyz@e2e.test');
    await page.getByPlaceholder('••••••••').fill('SomePass123!');

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);

    expect([401, 400, 404]).toContain(loginResponse.status());
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('accessing /opportunities without auth → redirects to /login', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('accessing /research without auth → redirects to /login', async ({ page }) => {
    await page.goto('/research');
    await page.waitForURL('**/login', { timeout: 10_000 });
  });

  test('register → sign out → login (full round-trip)', async ({ page }) => {
    const ts = String(Math.floor(Math.random() * 999999));
    const email = `rt-${ts}@e2e.test`;
    const password = 'TestPass123!';

    // Register
    await page.goto('/register');
    await page.getByPlaceholder('John Doe').fill('Roundtrip');
    await page.getByPlaceholder('My eCommerce Store').fill('RT Org');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Min. 8 characters').fill(password);
    await page.getByRole('button', { name: 'Create free account' }).click();
    await page.waitForURL('**/opportunities', { timeout: 15_000 });

    // Sign out
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login', { timeout: 5_000 });

    // Login with same creds
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/opportunities', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
  });
});
