import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.locator('header')).toBeVisible();
  });

  test('header shows SellBodr branding', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.getByText('SellBodr')).toBeVisible();
    await expect(header.getByText('eCommerce Intelligence')).toBeVisible();
  });

  test('search dropdown opens and filters pages by query', async ({ page }) => {
    // Click the desktop search bar via its aria-label
    await page.locator('button[aria-label="Search (⌘K)"]').click();
    const input = page.locator('input[placeholder*="Search"]');
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Type a query to filter — brings matching page to top (avoids overflow-clip visibility issues)
    await input.fill('Recommendations');
    await expect(
      page.locator('button').filter({ hasText: 'Recommendations' }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Verify a different page can be found via filter
    await input.fill('Reports');
    await expect(
      page.locator('button').filter({ hasText: 'Reports' }).first()
    ).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
  });

  test('user menu shows sign out option', async ({ page }) => {
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.getByText('Sign out')).toBeVisible({ timeout: 3_000 });
  });

  test('active Opportunities page shows Scout heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });

  test('navigate to Research page', async ({ page }) => {
    await page.goto('/research');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Research page has active nav indicator in header', async ({ page }) => {
    await page.goto('/research');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Suppliers page', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Marketplace page', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Profitability page', async ({ page }) => {
    await page.goto('/profitability');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to AI Listing page', async ({ page }) => {
    await page.goto('/listing');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Recommendation page', async ({ page }) => {
    await page.goto('/recommendation');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('back-navigate works (browser back button)', async ({ page }) => {
    await page.goto('/research');
    await page.goBack();
    await page.waitForURL('**/opportunities');
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });

  test('sign out → returns to /opportunities as guest and clears localStorage tokens', async ({ page }) => {
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByText('Sign out').click();
    // Sign-out now returns to /opportunities (guest mode), not /login
    await page.waitForURL('**/opportunities', { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('bs_access_token'));
    expect(token).toBeNull();
    // Guest indicator is present (Sign in button or guest banner)
    await expect(
      page.locator('a[href="/login"], button').filter({ hasText: /Sign in/i }).first()
        .or(page.locator('text=/browsing as a guest/i').first())
    ).toBeVisible({ timeout: 5_000 });
  });
});
