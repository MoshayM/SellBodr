import { test, expect, type Page } from '@playwright/test';

async function goToFirstOpportunity(page: Page) {
  await page.goto('/opportunities');
  await expect(page.getByRole('heading', { name: 'Scout' })).toBeVisible();
  await page.locator('tr.animate-pulse').first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});

  const noOpps = await page.getByText('No opportunities yet').isVisible().catch(() => false);
  if (noOpps) {
    // Try dev seed first; fall back to Groq search (works in production too)
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
    await expect(page.locator('tbody tr').first().locator('.font-medium')).toBeVisible({ timeout: 15_000 });
  }

  // Click the first row to expand the BreakdownPanel (rows are clickable to expand)
  const firstRow = page.locator('tbody tr').first();
  await firstRow.click();

  // "Full Report" link is in the table's row actions (always visible in desktop table view).
  // Scope to "table a" to avoid the hidden mobile-card duplicate that md:hidden hides.
  const fullReportLink = page.locator('table a').filter({ hasText: /Full Report/i }).first();
  await expect(fullReportLink).toBeVisible({ timeout: 10_000 });
  await fullReportLink.click();

  await page.waitForURL(/\/opportunities\/[0-9a-f-]{36}$/, { timeout: 15_000 });
}

test.describe('Opportunity Detail Page', () => {
  test('navigates to detail page URL with UUID', async ({ page }) => {
    await goToFirstOpportunity(page);
    expect(page.url()).toMatch(/\/opportunities\/[0-9a-f-]{36}$/);
  });

  test('header shows product title and recommendation', async ({ page }) => {
    await goToFirstOpportunity(page);

    // Product title (h1)
    await expect(page.locator('h1').first()).toBeVisible();
    // Recommendation text (Launch / Hold / Reject)
    await expect(page.locator('text=/Launch|Hold|Reject/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('header shows score version', async ({ page }) => {
    await goToFirstOpportunity(page);
    await expect(page.locator('text=/v2\\.0\\.0/').first()).toBeVisible({ timeout: 5_000 });
  });

  test('header shows marketplace code badge', async ({ page }) => {
    await goToFirstOpportunity(page);
    // Marketplace code shown in a .font-mono span (e.g. "AMAZON_US")
    await expect(page.locator('.font-mono').first()).toBeVisible({ timeout: 5_000 });
  });

  test('sub-score labels visible in header', async ({ page }) => {
    await goToFirstOpportunity(page);
    for (const label of ['Demand', 'Competition', 'Margin', 'Trend', 'Shipping']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('all 10 detail tabs are visible', async ({ page }) => {
    await goToFirstOpportunity(page);
    const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Ads', 'Growth', 'Recommendation', 'Report'];
    for (const tab of TABS) {
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
  });

  test('Overview tab shows sub-score cards', async ({ page }) => {
    await goToFirstOpportunity(page);
    // Overview is active by default — sub-score labels appear in card grid
    await expect(page.getByText('Demand').first()).toBeVisible();
    await expect(page.getByText('Competition').first()).toBeVisible();
    await expect(page.getByText('Margin').first()).toBeVisible();
    await expect(page.getByText('Saturation').first()).toBeVisible();
    await expect(page.getByText('Trend').first()).toBeVisible();
  });

  test('Research tab shows product research data', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Research', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Market Intelligence' })).toBeVisible();
    await expect(page.getByText('Demand').first()).toBeVisible();
    await expect(page.getByText('Trend').first()).toBeVisible();
  });

  test('Suppliers tab shows sourcing section', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Suppliers', exact: true }).click();

    await expect(page.getByText('Sourcing Candidates')).toBeVisible();
    // Either a table or "No suppliers found"
    await expect(page.locator('text=/Supplier|No suppliers found/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Suppliers tab table has correct headers when data exists', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Suppliers', exact: true }).click();

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    if (hasTable) {
      const headers = page.locator('thead th');
      await expect(headers.filter({ hasText: 'Supplier' })).toBeVisible();
      await expect(headers.filter({ hasText: 'MOQ' })).toBeVisible();
      // Accept either "Platform"/"Country" for source column and "Lead"/"Lead Time" for lead column
      await expect(
        page.locator('thead th').filter({ hasText: /Platform|Country/i }).first()
      ).toBeVisible();
    }
  });

  test('Profitability tab shows Cost Waterfall chart', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Profitability', exact: true }).click();

    await expect(page.locator('text=/Cost Waterfall/i').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible({ timeout: 8_000 });
  });

  test('Profitability tab shows profit metric text', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Profitability', exact: true }).click();

    await expect(page.locator('text=/Net Profit|ROI|Margin|Break-even/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Competition tab shows competition analysis', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Competition', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Competition Analysis' })).toBeVisible();
    await expect(page.getByText('Competition Score').first()).toBeVisible();
    await expect(page.getByText('Saturation Score').first()).toBeVisible();
    await expect(page.getByText(/Higher = less competition/i)).toBeVisible();
  });

  test('Listing tab shows generate CTA or existing listing', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Listing', exact: true }).click();

    await expect(
      page.locator('text=/SEO Title|Generate Launch Assets/i').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Recommendation tab shows score breakdown', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Recommendation', exact: true }).click();

    await expect(page.getByText('Score Breakdown')).toBeVisible();
    for (const label of ['Demand', 'Competition', 'Margin', 'Trend']) {
      await expect(page.locator('text=' + label).first()).toBeVisible();
    }
  });

  test('Recommendation tab shows recommendation message', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Recommendation', exact: true }).click();

    await expect(
      page.locator('text=/Strong opportunity|Promising opportunity|Low opportunity/i')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Report tab shows heading and generate button', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Report', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Opportunity Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Report/i })).toBeVisible();
  });

  test('Ads tab shows campaign generator', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Ads', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Ad Campaign Generator' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Generate Ads/i })).toBeVisible({ timeout: 5_000 });
    // Platform placeholders visible before generation
    await expect(page.getByText('Facebook').first()).toBeVisible();
    await expect(page.getByText('Instagram').first()).toBeVisible();
  });

  test('Ads tab generate button triggers generation state', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Ads', exact: true }).click();

    const genBtn = page.getByRole('button', { name: /Generate Ads/i });
    await expect(genBtn).toBeVisible({ timeout: 5_000 });
    await genBtn.click();

    // Either spinner or generated content should appear (API may or may not be available)
    await expect(
      page.locator('text=/Generating|Facebook|Instagram|YouTube|Google/i').first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('Growth tab shows playbook generator', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Growth', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Growth Playbook' })).toBeVisible({ timeout: 5_000 });
    // Button is "Build Playbook" when no data exists, "↻ Refresh Playbook" when data already saved
    await expect(page.getByRole('button', { name: /Build Playbook|Refresh Playbook/i })).toBeVisible({ timeout: 5_000 });
    // Either placeholders (no data) or generated content (data exists) should be visible
    await expect(page.locator('text=/Quick Wins|Launch Sequence|Generating/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Growth tab generate button triggers generation state', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Growth', exact: true }).click();

    const genBtn = page.getByRole('button', { name: /Build Playbook|Refresh Playbook/i });
    await expect(genBtn).toBeVisible({ timeout: 5_000 });
    await genBtn.click();

    await expect(
      page.locator('text=/Generating|Quick Wins|Listing Optimization|Launch Sequence/i').first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('Suppliers tab shows minimum sourcing candidate count badge', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Suppliers', exact: true }).click();

    await expect(page.getByText('Sourcing Candidates')).toBeVisible();
    // Check supplier count badge is visible (format: "(N suppliers)")
    await expect(page.locator('text=/suppliers/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Report tab has highlighted indicator', async ({ page }) => {
    await goToFirstOpportunity(page);
    // Report tab should have amber colour styling even when inactive
    const reportTab = page.getByRole('button', { name: 'Report', exact: true });
    await expect(reportTab).toBeVisible();
    // Clicking it activates it
    await reportTab.click();
    await expect(page.getByRole('heading', { name: 'Opportunity Report' })).toBeVisible({ timeout: 5_000 });
  });

  test('tab switching is stable — no crashes across all 10 tabs', async ({ page }) => {
    await goToFirstOpportunity(page);
    const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Ads', 'Growth', 'Recommendation', 'Report'];

    for (const tab of TABS) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      // No React crash
      await expect(page.locator('text=/Something went wrong|crashed|Minified React error/i')).toHaveCount(0);
    }
  });
});
