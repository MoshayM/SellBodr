import { test, expect } from '@playwright/test';

// All tests in this file run as a completely unauthenticated guest
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Landing page (guest)', () => {
  test('cover page (/) renders with CTA buttons', async ({ page }) => {
    await page.goto('/');
    // Landing page renders without login redirect
    await expect(page.getByRole('link', { name: /Scout your first product|Get started/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible();
  });

  test('Sign in link on cover page navigates to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: /Sign in/i }).first().click();
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 15_000 });
  });

  test('primary CTA on cover page links to /register', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /Scout your first product/i }).first();
    await expect(cta).toBeVisible({ timeout: 15_000 });
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/\/register/);
  });
});

test.describe('Protected routes redirect guests to /login', () => {
  const PROTECTED_ROUTES = [
    '/opportunities',
    '/research',
    '/suppliers',
    '/profitability',
    '/listing',
    '/reports',
    '/recommendation',
    '/marketplace',
  ];

  for (const path of PROTECTED_ROUTES) {
    test(`${path} → redirects guest to /login`, async ({ page }) => {
      await page.goto(path);
      // layout.tsx auth guard: if no token → router.replace('/login')
      await page.waitForURL('**/login', { timeout: 15_000 });
      expect(page.url()).toMatch(/\/login/);
    });
  }
});

test.describe('Sign-out flow', () => {
  test('sign-in → sign-out → redirects to /login and clears token', async ({ page }) => {
    test.setTimeout(120_000);

    // Sign in with the fixed e2e credentials
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@SellBodr.test');
    // Switch to password mode (login starts in PIN mode)
    await page.getByText(/Use password instead/i).click();
    await page.getByPlaceholder('••••••••').fill('TestPass123!');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForURL('**/opportunities', { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();

    // Sign out via avatar menu
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByText('Sign out').click();

    // logout() calls clearAuth() + router.replace('/login')
    await page.waitForURL('**/login', { timeout: 10_000 });

    // Token should be cleared from localStorage
    const token = await page.evaluate(() => localStorage.getItem('bs_access_token'));
    expect(token).toBeNull();

    // /login page should show the welcome heading
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Register PIN UX', () => {
  test('register step 2 shows PIN-first setup (no USB security key)', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    // Password fields are directly visible (no toggle needed)
    await expect(page.getByPlaceholder('Min 8 characters')).toBeVisible({ timeout: 5_000 });

    // USB security key option should NOT be present
    await expect(page.locator('text=/USB security key/i')).toHaveCount(0);

    // "Password only" checkbox for skipping PIN setup is available
    await expect(page.getByLabel(/Password only/i)).toBeVisible();
  });

  test('register step 2 offers PIN fast-login setup', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    // Default submit button encourages PIN setup
    await expect(page.getByRole('button', { name: /Create account|Continue/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('login page shows PIN-first mode (no USB key mention)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 20_000 });
    // USB key should not appear in the hint text
    await expect(page.locator('text=/USB key/i')).toHaveCount(0);
    // PIN mode is visible — "Use password instead" switch available
    await expect(page.getByText(/Use password instead/i)).toBeVisible();
  });
});
