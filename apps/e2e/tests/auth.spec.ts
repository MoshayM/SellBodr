import { test, expect } from '@playwright/test';

// These tests bypass saved auth state to test fresh authentication flows
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 20_000 });
    // PIN-first login: email always shown, "Use password instead" to switch modes
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByText(/Use password instead/i)).toBeVisible();
    await expect(page.getByText('SellBodr', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Sign in to your SellBodr account')).toBeVisible();
  });

  test('register page step 1 renders plan selection', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 20_000 });
    // Step 1 shows plan cards with "Start for Free" or "Start 7-Day Free Trial" CTA
    await expect(page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first()).toBeVisible();
    await expect(page.getByText('SellBodr', { exact: true }).first()).toBeVisible();
  });

  test('register page step 2 renders account form', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByPlaceholder('Jane Smith')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    // Password fields are directly visible in step 2 (no toggle needed)
    await expect(page.getByPlaceholder('Min 8 characters')).toBeVisible();
    await expect(page.getByPlaceholder('Repeat password')).toBeVisible();
    // Button is "Continue → Set fast login PIN" by default or "Create account →" if password-only checked
    await expect(page.getByRole('button', { name: /Create account|Continue/i }).first()).toBeVisible();
  });

  test('register → links to login page', async ({ page }) => {
    await page.goto('/register');
    // Sign in link only appears on the form step (step 2)
    await page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await page.getByRole('link', { name: /Sign in/ }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 20_000 });
  });

  test('login → links to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Start free/ }).click();
    await page.waitForURL('**/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 20_000 });
  });

  test('register new user → redirects to /opportunities', async ({ page }) => {
    test.setTimeout(120_000); // registration hits Turso (multiple inserts) + bcrypt — can be slow
    const ts = String(Date.now()).slice(-6);
    const email = `reg-${ts}@e2e.test`;

    await page.goto('/register');
    await page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first().click();
    await page.getByPlaceholder('Jane Smith').fill('New User');
    await page.getByPlaceholder('you@example.com').fill(email);
    // Password fields are directly visible in step 2
    await page.getByPlaceholder('Min 8 characters').fill('TestPass123!');
    await page.getByPlaceholder('Repeat password').fill('TestPass123!');
    // Check "Password only" so the form submits directly to /opportunities (skipping PIN setup)
    await page.getByLabel(/Password only/i).check();
    await page.getByRole('button', { name: /Create account/i }).click();

    await page.waitForURL('**/opportunities', { timeout: 45_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('login with valid credentials → redirects to /opportunities', async ({ page }) => {
    test.setTimeout(120_000); // login hits Turso + bcrypt.compare — can be slow on cold start
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@SellBodr.test');
    // Switch to password mode (login starts in PIN mode)
    await page.getByText(/Use password instead/i).click();
    await page.getByPlaceholder('••••••••').fill('TestPass123!');
    await page.getByRole('button', { name: /Sign in/i }).click();

    // Next.js client-side navigation after login; domcontentloaded avoids waiting for load event
    await page.waitForURL('**/opportunities', { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });

  test('login with wrong password → API returns 401 and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@SellBodr.test');
    // Switch to password mode first
    await page.getByText(/Use password instead/i).click();
    await page.getByPlaceholder('••••••••').fill('WrongPassword999!');

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10_000 }),
      page.getByRole('button', { name: /Sign in/i }).click(),
    ]);

    expect(loginResponse.status()).toBe(401);
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('login with unknown email → API returns 4xx and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('nobody-unknown-xyz@e2e.test');
    // Switch to password mode first
    await page.getByText(/Use password instead/i).click();
    await page.getByPlaceholder('••••••••').fill('SomePass123!');

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10_000 }),
      page.getByRole('button', { name: /Sign in/i }).click(),
    ]);

    expect([401, 400, 404]).toContain(loginResponse.status());
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('accessing /opportunities without auth → redirects to /login', async ({ page }) => {
    await page.goto('/opportunities');
    // No token → layout auth guard fires router.replace('/login')
    await page.waitForURL('**/login', { timeout: 15_000 });
    expect(page.url()).toMatch(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 10_000 });
  });

  test('accessing /research without auth → redirects to /login', async ({ page }) => {
    await page.goto('/research');
    // No token → layout auth guard fires router.replace('/login')
    await page.waitForURL('**/login', { timeout: 15_000 });
    expect(page.url()).toMatch(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 10_000 });
  });

  test('login page shows PIN-first mode by default', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 20_000 });
    // Login starts in PIN mode — 4 single-digit PIN boxes visible
    const pinInputs = page.locator('input[type="password"][maxlength="1"]');
    await expect(pinInputs.first()).toBeVisible({ timeout: 5_000 });
    await expect(pinInputs).toHaveCount(4);
    // Can switch to password mode
    await expect(page.getByText(/Use password instead/i)).toBeVisible();
  });

  test('switching to password mode shows password form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Use password instead/i)).toBeVisible({ timeout: 20_000 });
    await page.getByText(/Use password instead/i).click();
    // Password form should be visible after switching
    await expect(page.getByPlaceholder('••••••••')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
    // Can switch back to PIN mode
    await expect(page.getByText(/Use PIN instead/i)).toBeVisible();
    // Should remain on login page
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('register → sign out → login (full round-trip)', async ({ page }) => {
    test.setTimeout(120_000);
    const ts = String(Date.now()).slice(-6);
    const email = `rt-${ts}@e2e.test`;
    const password = 'TestPass123!';

    // Register: step 1 → step 2 → submit with password-only (skip PIN)
    await page.goto('/register');
    await page.getByRole('button', { name: /Start for Free|Start 7-Day Free Trial/i }).first().click();
    await page.getByPlaceholder('Jane Smith').fill('Roundtrip User');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Min 8 characters').fill(password);
    await page.getByPlaceholder('Repeat password').fill(password);
    await page.getByLabel(/Password only/i).check();
    await page.getByRole('button', { name: /Create account/i }).click();
    await page.waitForURL('**/opportunities', { timeout: 45_000, waitUntil: 'domcontentloaded' });

    // Sign out — open user avatar menu then click Sign out
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByText('Sign out').click();
    // Sign-out now returns to /opportunities as guest (not /login)
    await page.waitForURL('**/opportunities', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();

    // Navigate to login to sign back in
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(email);
    // Switch to password mode (login starts in PIN mode)
    await page.getByText(/Use password instead/i).click();
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /Sign in/i }).click();
    // Next.js client-side navigation after login can be slow on first visit; 45s covers compilation
    await page.waitForURL('**/opportunities', { timeout: 45_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });
});
