import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('sidebar shows SellBodr branding', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('SellBodr')).toBeVisible();
    await expect(sidebar.getByText('Intelligence Platform')).toBeVisible();
  });

  test('sidebar shows all navigation links', async ({ page }) => {
    const nav = page.locator('aside nav');
    for (const label of ['Opportunities', 'Research', 'Suppliers', 'Marketplace', 'Profitability', 'Listing', 'Recommendation', 'Reports']) {
      await expect(nav.getByText(label)).toBeVisible();
    }
  });

  test('sidebar shows sign out button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('active Opportunities link has active styling', async ({ page }) => {
    const link = page.locator('aside nav a[href="/opportunities"]');
    // Active link has text-white + violet bg gradient (not text-gray or text-white/45)
    await expect(link).toHaveClass(/text-white/);
  });

  test('navigate to Research page', async ({ page }) => {
    await page.locator('aside nav').getByText('Research').click();
    await page.waitForURL('**/research');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Research page has active nav highlight', async ({ page }) => {
    await page.locator('aside nav').getByText('Research').click();
    await page.waitForURL('**/research');
    const link = page.locator('aside nav a[href="/research"]');
    // Active link gets text-white class (full opacity, not white/45)
    await expect(link).toHaveClass(/text-white/);
  });

  test('navigate to Suppliers page', async ({ page }) => {
    await page.locator('aside nav').getByText('Suppliers').click();
    await page.waitForURL('**/suppliers');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Marketplace page', async ({ page }) => {
    await page.locator('aside nav').getByText('Marketplace').click();
    await page.waitForURL('**/marketplace');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Profitability page', async ({ page }) => {
    await page.locator('aside nav').getByText('Profitability').click();
    await page.waitForURL('**/profitability');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to AI Listing page', async ({ page }) => {
    await page.locator('aside nav').getByText('AI Listing').click();
    await page.waitForURL('**/listing');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Recommendation page', async ({ page }) => {
    await page.locator('aside nav').getByText('Recommendation').click();
    await page.waitForURL('**/recommendation');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigate to Reports page', async ({ page }) => {
    await page.locator('aside nav').getByText('Reports').click();
    await page.waitForURL('**/reports');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('back-navigate works (browser back button)', async ({ page }) => {
    await page.locator('aside nav').getByText('Research').click();
    await page.waitForURL('**/research');
    await page.goBack();
    await page.waitForURL('**/opportunities');
    await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible();
  });

  test('sign out → redirects to /login and clears localStorage tokens', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out' }).evaluate((el: HTMLButtonElement) => el.click());
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 30_000 });
    const token = await page.evaluate(() => localStorage.getItem('bs_access_token'));
    expect(token).toBeNull();
  });
});
