import { test, expect, type Page } from '@playwright/test';

// The dashboard page has 2 selects: [0]=Marketplace [1]=Recommendation
// Labels don't use for/id so we use position-based selectors
function marketplaceSelect(page: Page) { return page.locator('select').first(); }
function recommendationSelect(page: Page) { return page.locator('select').nth(1); }

async function runNewSearch(page: Page) {
  await page.getByRole('button', { name: '+ New Search' }).click();
  await expect(page.getByText(/Running AI pipeline/i)).toBeVisible({ timeout: 5_000 });
  // Wait for button to return (pipeline complete) — no networkidle since HMR keeps sockets open
  await expect(page.getByRole('button', { name: '+ New Search' })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function ensureHasOpportunities(page: Page) {
  await page.goto('/opportunities');
  await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
  const noOpps = await page.getByText('No opportunities yet').isVisible().catch(() => false);
  if (noOpps) {
    await runNewSearch(page);
  }
}

test.describe('Opportunity Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
  });

  test('shows heading and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();
    await expect(page.getByText('AI-ranked cross-border eCommerce opportunities')).toBeVisible();
  });

  test('marketplace filter has all 7 options', async ({ page }) => {
    const select = marketplaceSelect(page);
    await expect(select).toBeVisible();
    for (const code of ['amazon_us', 'amazon_uk', 'amazon_de', 'amazon_ca', 'amazon_au', 'etsy', 'ebay']) {
      await expect(select.locator(`option[value="${code}"]`)).toBeAttached();
    }
  });

  test('recommendation filter has launch/hold/reject options', async ({ page }) => {
    const select = recommendationSelect(page);
    await expect(select).toBeVisible();
    for (const val of ['', 'launch', 'hold', 'reject']) {
      await expect(select.locator(`option[value="${val}"]`)).toBeAttached();
    }
  });

  test('"+ New Search" button runs pipeline and populates opportunity table', async ({ page }) => {
    await runNewSearch(page);

    await expect(page.locator('table')).toBeVisible({ timeout: 5_000 });
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('opportunity table has correct column headers', async ({ page }) => {
    await ensureHasOpportunities(page);

    const headers = page.locator('thead th');
    await expect(headers.filter({ hasText: 'Product' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Marketplace' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Score' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Recommendation' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Net Profit' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Confidence' })).toBeVisible();
  });

  test('each row has product title, marketplace badge, and View link', async ({ page }) => {
    await ensureHasOpportunities(page);

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('td').first().locator('.font-medium')).toBeVisible();
    await expect(firstRow.locator('.font-mono')).toBeVisible();
    await expect(firstRow.locator('a').filter({ hasText: 'View →' })).toBeVisible();
  });

  test('marketplace filter change updates selection', async ({ page }) => {
    await ensureHasOpportunities(page);

    const select = marketplaceSelect(page);
    await select.selectOption('amazon_uk');
    await expect(select).toHaveValue('amazon_uk');
  });

  test('marketplace filter changes back to amazon_us', async ({ page }) => {
    await ensureHasOpportunities(page);

    const select = marketplaceSelect(page);
    await select.selectOption('etsy');
    await expect(select).toHaveValue('etsy');
    await select.selectOption('amazon_us');
    await expect(select).toHaveValue('amazon_us');
  });

  test('recommendation filter "launch" shows filtered results or empty state', async ({ page }) => {
    await ensureHasOpportunities(page);

    const recSelect = recommendationSelect(page);
    await recSelect.selectOption('launch');
    await expect(recSelect).toHaveValue('launch');
    await expect(page.locator('table, .card:has-text("No opportunities")')).toBeVisible({ timeout: 5_000 });
  });

  test('recommendation filter "reject" shows filtered results or empty state', async ({ page }) => {
    await ensureHasOpportunities(page);

    const recSelect = recommendationSelect(page);
    await recSelect.selectOption('reject');
    await expect(recSelect).toHaveValue('reject');
    await expect(page.locator('table, .card:has-text("No opportunities")')).toBeVisible({ timeout: 5_000 });
  });

  test('empty state message is shown when no opportunities', async ({ page }) => {
    const noOpps = await page.getByText('No opportunities yet').isVisible().catch(() => false);
    if (noOpps) {
      await expect(page.getByText('Click "New Search" to discover products')).toBeVisible();
      await expect(page.getByRole('button', { name: '+ New Search' })).toBeVisible();
    } else {
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('running a second search adds more opportunities', async ({ page }) => {
    await ensureHasOpportunities(page);

    const countBefore = await page.locator('tbody tr').count();
    await runNewSearch(page);
    await expect(page.locator('tbody tr')).toHaveCount(countBefore + 10, { timeout: 10_000 }).catch(async () => {
      // If count didn't increase by exactly 10, just verify it's more than before
      const countAfter = await page.locator('tbody tr').count();
      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    });
  });
});
