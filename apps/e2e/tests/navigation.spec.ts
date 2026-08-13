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

  test('sidebar shows all 8 navigation links', async ({ page }) => {
    const nav = page.locator('aside nav');
    for (const label of ['Opportunities', 'Research', 'Suppliers', 'Marketplace', 'Profitability', 'Listing', 'Recommendation', 'Reports']) {
      await expect(nav.getByText(label)).toBeVisible();
    }
  });

  test('sidebar shows user info section with sign out button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('active Opportunities link has green text styling', async ({ page }) => {
    const link = page.locator('aside nav a[href="/opportunities"]');
    await expect(link).toHaveClass(/text-green-700/);
  });

  test('navigate to Research page', async ({ page }) => {
    await page.locator('aside nav').getByText('Research').click();
    await page.waitForURL('**/research');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Research page has correct active nav highlight', async ({ page }) => {
    await page.locator('aside nav').getByText('Research').click();
    await page.waitForURL('**/research');
    const link = page.locator('aside nav a[href="/research"]');
    await expect(link).toHaveClass(/text-green-700/);
    // Opportunities link should be inactive
    const oppLink = page.locator('aside nav a[href="/opportunities"]');
    await expect(oppLink).not.toHaveClass(/text-green-700/);
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

  test('navigate to Listing page', async ({ page }) => {
    await page.locator('aside nav').getByText('Listing').click();
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
    await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
  });

  test('sign out → redirects to /login and clears localStorage tokens', async ({ page }) => {
    // Use evaluate().click() to trigger React onClick directly, bypassing <nextjs-portal> overlay
    await page.getByRole('button', { name: 'Sign out' }).evaluate((el: HTMLButtonElement) => el.click());

    // Wait for navigation first — clearAuth() runs before router.push so by the time
    // the sign-in heading is visible, localStorage is guaranteed to be cleared
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 30_000 });

    const token = await page.evaluate(() => localStorage.getItem('bs_access_token'));
    expect(token).toBeNull();
  });
});
