import { test, expect } from '@playwright/test';

// All tests in this file run as a completely unauthenticated guest
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Guest-first access', () => {
  test('cover page (/) shows Browse Free CTA linking to /opportunities', async ({ page }) => {
    await page.goto('/');
    // Landing page renders without login redirect
    await expect(page.getByRole('link', { name: /Browse Free/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /Start Pro/i }).first()).toBeVisible();
  });

  test('Browse Free button takes guest directly to /opportunities dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Browse Free/i }).first().click();
    await page.waitForURL('**/opportunities', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });

  test('/opportunities loads as guest — no redirect to /login', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toMatch(/\/opportunities/);
  });

  test('guest banner visible on /opportunities', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/browsing as a guest/i')).toBeVisible({ timeout: 5_000 });
  });

  test('guest banner can be dismissed', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.locator('text=/browsing as a guest/i')).toBeVisible({ timeout: 10_000 });
    await page.locator('button[aria-label="Dismiss"]').click();
    await expect(page.locator('text=/browsing as a guest/i')).toHaveCount(0);
  });

  test('header shows Sign in button for guests (not avatar)', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('header').getByRole('link', { name: /Sign in/i })).toBeVisible();
    // No user avatar button
    await expect(page.getByRole('button', { name: 'User menu' })).toHaveCount(0);
  });
});

test.describe('ProGate upsell walls (guest)', () => {
  const GATED_PAGES = [
    { path: '/suppliers',      heading: /Supplier Sourcing|Suppliers/i },
    { path: '/research',       heading: /Market Research|Research/i },
    { path: '/profitability',  heading: /Full Profit Model|Profitability/i },
    { path: '/listing',        heading: /AI Listing Generator|Listing/i },
    { path: '/reports',        heading: /Export & Reports|Reports/i },
    { path: '/recommendation', heading: /AI Recommendations|Recommendation/i },
    { path: '/marketplace',    heading: /Marketplace Intelligence|Marketplace/i },
  ];

  for (const { path, heading } of GATED_PAGES) {
    test(`${path} shows ProGate for guests`, async ({ page }) => {
      await page.goto(path);
      // Page loads (no redirect to login)
      expect(page.url()).toMatch(new RegExp(path.replace('/', '\\/')));
      // ProGate full-page renders feature name in h1
      await expect(page.locator('h1').filter({ hasText: heading }).first()).toBeVisible({ timeout: 10_000 });
      // ProGate "Pro Feature" badge
      await expect(page.locator('text=/Pro Feature/i').first()).toBeVisible({ timeout: 5_000 });
      // ProGate CTAs
      await expect(page.getByRole('link', { name: /Start Pro/i }).first()).toBeVisible({ timeout: 5_000 });
    });
  }

  test('ProGate primary CTA links to /register', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.locator('h1').filter({ hasText: /Supplier Sourcing/i })).toBeVisible({ timeout: 10_000 });
    const cta = page.getByRole('link', { name: /Start Pro/i }).first();
    await expect(cta).toBeVisible({ timeout: 5_000 });
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/\/register/);
  });

  test('ProGate secondary CTA links to /login', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.locator('h1').filter({ hasText: /Supplier Sourcing/i })).toBeVisible({ timeout: 10_000 });
    const cta = page.getByRole('link', { name: /Sign in/i }).first();
    await expect(cta).toBeVisible({ timeout: 5_000 });
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/\/login/);
  });
});

test.describe('Sign-out returns to guest mode', () => {
  // This test authenticates mid-test then signs out to verify the return to guest
  test('sign-in → sign-out → returns to /opportunities as guest', async ({ page }) => {
    test.setTimeout(120_000);

    // Sign in with the fixed e2e credentials
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-fixed@SellBodr.test');
    await page.getByPlaceholder('••••••••').fill('TestPass123!');
    await page.getByRole('button', { name: /Sign in with Password/i }).click();
    await page.waitForURL('**/opportunities', { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();

    // Sign out via avatar menu
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByText('Sign out').click();

    // Should land on /opportunities — NOT /login
    await page.waitForURL('**/opportunities', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();

    // Token cleared
    const token = await page.evaluate(() => localStorage.getItem('bs_access_token'));
    expect(token).toBeNull();

    // Guest banner or Sign in button visible
    await expect(
      page.locator('text=/browsing as a guest/i')
        .or(page.locator('header').getByRole('link', { name: /Sign in/i }))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Register passkey UX', () => {
  test('register step 2 shows platform passkey button (no USB option)', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Continue with/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    // Platform passkey button is the primary CTA
    await expect(
      page.getByRole('button', { name: /Create.*passkey|PIN.*fingerprint/i }).first()
    ).toBeVisible({ timeout: 5_000 });

    // USB security key option should NOT be present
    await expect(page.locator('text=/USB security key/i')).toHaveCount(0);

    // Password fallback is still available
    await expect(page.getByText(/Use a password instead/i)).toBeVisible();
  });

  test('register passkey button hint mentions "No USB key needed"', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /Continue with/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.locator('text=/No USB key needed/i')).toBeVisible({ timeout: 5_000 });
  });

  test('login page passkey hint does not mention USB key', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    // USB key should not appear in the hint text
    await expect(page.locator('text=/USB key/i')).toHaveCount(0);
    // Device methods should be mentioned
    await expect(page.locator('text=/Touch ID|Windows Hello|fingerprint/i').first()).toBeVisible();
  });
});
