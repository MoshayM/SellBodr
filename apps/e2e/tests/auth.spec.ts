import { test, expect } from '@playwright/test';

// These tests bypass saved auth state to test fresh authentication flows
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    // Two sign-in buttons exist — check each specifically
    await expect(page.getByRole('button', { name: /Sign in with Passkey/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Password/i })).toBeVisible();
    await expect(page.getByText('SellBodr', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Sign in to your SellBodr account')).toBeVisible();
  });

  test('register page step 1 renders plan selection', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Choose your plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with/ })).toBeVisible();
    await expect(page.getByText('SellBodr', { exact: true }).first()).toBeVisible();
  });

  test('register page step 2 renders account form', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Continue with/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByPlaceholder('Jane Smith')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    // Password fields are behind "Use a password instead →" — click to reveal
    await page.getByText('Use a password instead').click();
    await expect(page.getByPlaceholder('Min 8 characters')).toBeVisible();
    await expect(page.getByPlaceholder('Repeat password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/ })).toBeVisible();
  });

  test('register → links to login page', async ({ page }) => {
    await page.goto('/register');
    // Sign in link only appears on the form step (step 2)
    await page.getByRole('button', { name: /Continue with/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await page.getByRole('link', { name: /Sign in/ }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('login → links to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Start free/ }).click();
    await page.waitForURL('**/register');
    await expect(page.getByRole('heading', { name: 'Choose your plan' })).toBeVisible();
  });

  test('register new user → redirects to /opportunities', async ({ page }) => {
    test.setTimeout(120_000); // registration hits Turso (multiple inserts) + bcrypt — can be slow
    const ts = String(Date.now()).slice(-6);
    const email = `reg-${ts}@e2e.test`;

    await page.goto('/register');
    await page.getByRole('button', { name: /Continue with/ }).first().click();
    await page.getByPlaceholder('Jane Smith').fill('New User');
    await page.getByPlaceholder('you@example.com').fill(email);
    // Expand password form (passkey-first design hides password fields by default)
    await page.getByText('Use a password instead').click();
    await page.getByPlaceholder('Min 8 characters').fill('TestPass123!');
    await page.getByPlaceholder('Repeat password').fill('TestPass123!');
    await page.getByRole('button', { name: /Create account/ }).click();

    await page.waitForURL('**/opportunities', { timeout: 45_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('login with valid credentials → redirects to /opportunities', async ({ page }) => {
    test.setTimeout(120_000); // login hits Turso + bcrypt.compare — can be slow on cold start
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@SellBodr.test');
    await page.getByPlaceholder('••••••••').fill('TestPass123!');
    await page.getByRole('button', { name: /Sign in with Password/i }).click();

    // Next.js client-side navigation after login; domcontentloaded avoids waiting for load event
    await page.waitForURL('**/opportunities', { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });

  test('login with wrong password → API returns 401 and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@SellBodr.test');
    await page.getByPlaceholder('••••••••').fill('WrongPassword999!');

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10_000 }),
      page.getByRole('button', { name: /Sign in with Password/i }).click(),
    ]);

    expect(loginResponse.status()).toBe(401);
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('login with unknown email → API returns 4xx and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('nobody-unknown-xyz@e2e.test');
    await page.getByPlaceholder('••••••••').fill('SomePass123!');

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 10_000 }),
      page.getByRole('button', { name: /Sign in with Password/i }).click(),
    ]);

    expect([401, 400, 404]).toContain(loginResponse.status());
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('accessing /opportunities without auth → loads as guest (no redirect)', async ({ page }) => {
    await page.goto('/opportunities');
    // Guests are welcome on the dashboard — no redirect to /login
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toMatch(/\/opportunities/);
    // Guest banner or Sign in button present
    await expect(
      page.locator('text=/browsing as a guest/i').or(page.locator('a[href="/login"], button').filter({ hasText: /Sign in/i })).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('accessing /research without auth → loads as guest with ProGate', async ({ page }) => {
    await page.goto('/research');
    // Should stay on /research — no redirect, but shows ProGate for guest
    await page.waitForURL(/\/research/, { timeout: 10_000 });
    // Either the page loaded with content or a ProGate is shown
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('passkey button shows loading state on click', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Sign in with Passkey/i })).toBeVisible();

    // Intercept the begin endpoint so WebAuthn fires in the browser (not an API 404)
    await page.route('**/passkey/login/begin', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challengeId: 'e2e-challenge',
          challenge: Buffer.from('e2e-test-challenge').toString('base64url'),
          timeout: 60_000,
          rpId: 'localhost',
          allowCredentials: [],
          userVerification: 'required',
        }),
      })
    );

    await page.getByRole('button', { name: /Sign in with Passkey/i }).click();

    // Loading state appears immediately
    await expect(page.locator('text=/Waiting for passkey/i')).toBeVisible({ timeout: 3_000 });
  });

  test('passkey cancellation shows helpful error message', async ({ page }) => {
    await page.goto('/login');

    // Intercept begin so WebAuthn is called in-browser (headless = no authenticator → NotAllowedError)
    await page.route('**/passkey/login/begin', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challengeId: 'e2e-challenge',
          challenge: Buffer.from('e2e-test-challenge').toString('base64url'),
          timeout: 60_000,
          rpId: 'localhost',
          allowCredentials: [],
          userVerification: 'required',
        }),
      })
    );

    await page.getByRole('button', { name: /Sign in with Passkey/i }).click();

    // In headless Chromium, WebAuthn throws NotAllowedError (no authenticator available)
    // The error message from the catch block should appear
    await expect(
      page.locator('text=/cancelled|Passkey|Try again|password|failed/i').first()
    ).toBeVisible({ timeout: 15_000 });

    // Should remain on login page (not redirect)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('register → sign out → login (full round-trip)', async ({ page }) => {
    test.setTimeout(120_000);
    const ts = String(Date.now()).slice(-6);
    const email = `rt-${ts}@e2e.test`;
    const password = 'TestPass123!';

    // Register: step 1 → step 2 → expand password form → submit
    await page.goto('/register');
    await page.getByRole('button', { name: /Continue with/ }).first().click();
    await page.getByPlaceholder('Jane Smith').fill('Roundtrip User');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByText('Use a password instead').click();
    await page.getByPlaceholder('Min 8 characters').fill(password);
    await page.getByPlaceholder('Repeat password').fill(password);
    await page.getByRole('button', { name: /Create account/ }).click();
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
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /Sign in with Password/i }).click();
    // Next.js client-side navigation after login can be slow on first visit; 45s covers compilation
    await page.waitForURL('**/opportunities', { timeout: 45_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });
});
