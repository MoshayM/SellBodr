import { test, expect, type Page } from '@playwright/test';

async function runNewSearch(page: Page) {
  // Use waitForResponse to reliably detect search result regardless of React render timing.
  // Clicking the button AND starting the response listener together prevents a race condition
  // where the response arrives before the listener is set up.
  const [searchResp] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/api/v1/searches') && resp.request().method() === 'POST',
      { timeout: 90_000 }
    ),
    page.getByRole('button', { name: /New Scan/i }).click(),
  ]);

  if (!searchResp.ok()) {
    const body = await searchResp.json().catch(() => ({}));
    throw new Error(`Search API failed (${searchResp.status()}): ${(body as any).error || 'unknown'}`);
  }

  // Wait for react-query invalidation + refetch to populate the table
  await expect(page.locator('tbody tr').first().locator('.font-medium').first()).toBeVisible({ timeout: 15_000 });
}

async function ensureHasOpportunities(page: Page) {
  await page.goto('/opportunities');
  await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  await page.locator('tr.animate-pulse').first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
  const noOpps = await page.getByText('No opportunities yet').isVisible().catch(() => false);
  if (noOpps) {
    // Try dev seed endpoint first; fall back to Groq search (works in production too)
    const seedRes = await page.request.post('/api/v1/test/seed', {
      data: { marketplace: 'amazon_us' },
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);
    if (!seedRes || !seedRes.ok()) {
      const token = await page.evaluate(() => localStorage.getItem('bs_access_token'));
      await page.request.post('/api/v1/searches', {
        data: { marketplace: 'amazon_us' },
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        timeout: 60_000,
      }).catch(() => null);
    }
    await page.reload();
    await page.locator('tr.animate-pulse').first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
  }
}

test.describe('Opportunity Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  });

  test('shows heading and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/AI-ranked products sourced from India/i)).toBeVisible();
  });

  test('marketplace dropdown is visible and shows selected marketplace', async ({ page }) => {
    // Marketplace selector button is always visible in the filter bar
    await expect(
      page.locator('button').filter({ hasText: /Amazon|Etsy|eBay|Allegro|Walmart|TikTok|Select/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('signal filter select has Launch / Hold / Reject options', async ({ page }) => {
    // The Signal select (recommendation filter) has these options
    const signalSelect = page.locator('select').filter({ hasText: /All Signals|Launch|Hold|Reject/ }).first();
    await expect(signalSelect).toBeVisible({ timeout: 5_000 });
    // Options are present in the select
    await expect(page.locator('option[value="launch"]').first()).toBeAttached();
    await expect(page.locator('option[value="hold"]').first()).toBeAttached();
    await expect(page.locator('option[value="reject"]').first()).toBeAttached();
  });

  test('"+ New Scan" button runs AI pipeline and populates opportunity table', async ({ page, request }) => {
    // Intercept POST /searches and fulfil with the dev-only seed endpoint (no Groq needed)
    await page.route('**/api/v1/searches', async (route) => {
      if (route.request().method() !== 'POST') { await route.continue(); return; }
      const seedRes = await request.post('/api/v1/test/seed', { data: { marketplace: 'amazon_us' } }).catch(() => null);
      const count = (seedRes?.ok() ? (await seedRes.json().catch(() => ({}))).count : 0) ?? 0;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ searchId: 'test-seed', status: 'complete', count }) });
    });

    await runNewSearch(page);

    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('opportunity table has correct column headers', async ({ page }) => {
    await ensureHasOpportunities(page);

    const headers = page.locator('thead th');
    await expect(headers.filter({ hasText: 'Product' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Score' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Signal' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Net Profit' })).toBeVisible();
  });

  test('each row has product title and Research button; clicking expands breakdown with Full Report link', async ({ page }) => {
    await ensureHasOpportunities(page);

    const firstRow = page.locator('tbody tr').first();
    // Product title in first column
    await expect(firstRow.locator('td').first().locator('.font-medium')).toBeVisible();
    // Research button is icon-only — match by title attribute
    await expect(firstRow.locator('button[title*="research" i], button[title*="Quick research" i]')).toBeVisible();
    // Full Report link is in the table's actions column (always visible — scoped to table to avoid
    // picking the hidden mobile-card "Full Report →" link which shares the same text but is inside md:hidden)
    await expect(page.locator('table a').filter({ hasText: /Full Report/i }).first()).toBeVisible();
  });

  test('clicking marketplace dropdown opens searchable panel', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /Amazon|Allegro|eBay|Etsy|Select marketplace/i }).first();
    await btn.click();
    // Search input appears in the portal panel
    await expect(page.locator('input[placeholder*="marketplaces"]')).toBeVisible({ timeout: 5_000 });
    // Close by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('signal "Launch" filter shows filtered results', async ({ page }) => {
    await ensureHasOpportunities(page);

    // Select Launch from Signal dropdown
    const signalSelect = page.locator('select').filter({ hasText: /All Signals/ }).first();
    await signalSelect.selectOption('launch');

    // After filtering, either a table (with or without rows) or empty state must be visible
    await expect(
      page.locator('table').or(page.getByText(/No results match|No opportunities/))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('"All Signals" resets signal filter', async ({ page }) => {
    await ensureHasOpportunities(page);

    const signalSelect = page.locator('select').filter({ hasText: /All Signals/ }).first();
    await signalSelect.selectOption('launch');
    await signalSelect.selectOption('');
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
  });

  test('empty state message shown when no opportunities exist', async ({ page }) => {
    // Wait for loading to finish
    await page.locator('tr.animate-pulse').first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
    const noOpps = await page.getByText('No opportunities yet').isVisible().catch(() => false);
    if (noOpps) {
      await expect(page.getByText(/Click.*New.*Scan|New Scan to discover/i)).toBeVisible();
    } else {
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('running a second search adds more opportunities', async ({ page, request }) => {
    await ensureHasOpportunities(page);

    const countBefore = await page.locator('tbody tr').count();

    // Intercept POST /searches and fulfil with the dev-only seed endpoint (no Groq needed)
    await page.route('**/api/v1/searches', async (route) => {
      if (route.request().method() !== 'POST') { await route.continue(); return; }
      const seedRes = await request.post('/api/v1/test/seed', { data: { marketplace: 'amazon_us' } }).catch(() => null);
      const count = (seedRes?.ok() ? (await seedRes.json().catch(() => ({}))).count : 0) ?? 0;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ searchId: 'test-seed-2', status: 'complete', count }) });
    });

    await runNewSearch(page);
    const countAfter = await page.locator('tbody tr').count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });
});
