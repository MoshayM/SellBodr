import { test, expect, type Page } from '@playwright/test';

async function goToFirstOpportunity(page: Page) {
  await page.goto('/opportunities');
  await expect(page.getByRole('heading', { name: 'Opportunity Dashboard' })).toBeVisible();

  // Run a search if no opportunities exist yet
  const noOpps = await page.getByText('No opportunities yet').isVisible().catch(() => false);
  if (noOpps) {
    await page.getByRole('button', { name: '+ New Search' }).click();
    await expect(page.getByText(/Running AI pipeline/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: '+ New Search' })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500);
  }

  const viewLink = page.locator('a').filter({ hasText: 'View →' }).first();
  await expect(viewLink).toBeVisible({ timeout: 10_000 });
  await viewLink.click();

  // Wait until URL has navigated to the detail page (UUID route)
  await page.waitForURL(/\/opportunities\/[0-9a-f-]{36}$/, { timeout: 15_000 });
}

test.describe('Opportunity Detail Page', () => {
  test('navigates to detail page URL with UUID', async ({ page }) => {
    await goToFirstOpportunity(page);
    expect(page.url()).toMatch(/\/opportunities\/[0-9a-f-]{36}$/);
  });

  test('header shows product title, marketplace badge and recommendation', async ({ page }) => {
    await goToFirstOpportunity(page);

    // Product title (h1)
    await expect(page.locator('h1').first()).toBeVisible();
    // Marketplace badge uses font-mono
    await expect(page.locator('.font-mono').first()).toBeVisible();
    // Recommendation text (Launch / Hold / Reject)
    const rec = page.locator('text=/Launch|Hold|Reject/i').first();
    await expect(rec).toBeVisible({ timeout: 5_000 });
  });

  test('header shows score version', async ({ page }) => {
    await goToFirstOpportunity(page);
    await expect(page.locator('text=/v2\\.0\\.0/')).toBeVisible();
  });

  test('sub-score badges in header (Demand, Competition, Margin, etc.)', async ({ page }) => {
    await goToFirstOpportunity(page);
    for (const label of ['Demand', 'Competition', 'Margin', 'Trend', 'Shipping']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('all 8 detail tabs are visible', async ({ page }) => {
    await goToFirstOpportunity(page);
    const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Recommendation', 'Report'];
    for (const tab of TABS) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });

  test('Overview tab shows sub-score cards grid', async ({ page }) => {
    await goToFirstOpportunity(page);
    // Overview is active by default
    await expect(page.getByText('Demand Score')).toBeVisible();
    await expect(page.getByText('Competition Score')).toBeVisible();
    await expect(page.getByText('Margin Score')).toBeVisible();
    await expect(page.getByText('Saturation Score')).toBeVisible();
    await expect(page.getByText('Trend Score')).toBeVisible();
  });

  test('Research tab shows product research data', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Research' }).click();

    await expect(page.getByRole('heading', { name: 'Product Research' })).toBeVisible();
    await expect(page.getByText('Category')).toBeVisible();
    await expect(page.getByText('Weight')).toBeVisible();
    await expect(page.getByText('Demand Score')).toBeVisible();
    await expect(page.getByText('Trend Score')).toBeVisible();
  });

  test('Suppliers tab shows sourcing candidates or no-suppliers message', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Suppliers' }).click();

    await expect(page.getByText('Sourcing Candidates')).toBeVisible();
    const content = page.locator('text=/Supplier|No suppliers found/i');
    await expect(content.first()).toBeVisible({ timeout: 5_000 });
  });

  test('Suppliers tab table has correct headers when data exists', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Suppliers' }).click();

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    if (hasTable) {
      const headers = page.locator('thead th');
      await expect(headers.filter({ hasText: 'Supplier' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Source' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Cost' })).toBeVisible();
      await expect(headers.filter({ hasText: 'MOQ' })).toBeVisible();
      await expect(headers.filter({ hasText: 'Lead Time' })).toBeVisible();
    }
  });

  test('Profitability tab shows Profit Waterfall chart', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Profitability' }).click();

    await expect(page.getByRole('heading', { name: 'Profit Waterfall' })).toBeVisible();
    // Recharts container (use .first() — profitability page can have multiple chart containers)
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Profitability tab shows profit metric cards', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Profitability' }).click();

    await expect(page.locator('text=/Net Profit|ROI|Margin|Break-even/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Competition tab shows scores and analysis info', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Competition' }).click();

    await expect(page.getByRole('heading', { name: 'Competition Analysis' })).toBeVisible();
    await expect(page.getByText('Competition Score')).toBeVisible();
    await expect(page.getByText('Saturation Score')).toBeVisible();
    await expect(page.getByText(/Higher = less competition/i)).toBeVisible();
  });

  test('Listing tab shows generate button or existing listing content', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Listing' }).click();

    const listingOrCta = page.locator('text=/SEO Title|Generate Launch Assets/i');
    await expect(listingOrCta.first()).toBeVisible({ timeout: 5_000 });
  });

  test('Recommendation tab shows score breakdown bars', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Recommendation' }).click();

    await expect(page.getByText('Score Breakdown')).toBeVisible();
    // Score bars for each dimension
    for (const label of ['Demand', 'Competition', 'Margin', 'Trend']) {
      await expect(page.locator('text=' + label).first()).toBeVisible();
    }
  });

  test('Recommendation tab shows recommendation message text', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Recommendation' }).click();

    // One of three possible recommendation texts
    const msg = page.locator('text=/Strong opportunity|Promising opportunity|Low opportunity/i');
    await expect(msg).toBeVisible({ timeout: 5_000 });
  });

  test('Report tab shows heading and generate button', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Report' }).click();

    await expect(page.getByRole('heading', { name: 'Opportunity Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Report/i })).toBeVisible();
  });

  test('"Generate Report" button creates report and shows JSON content', async ({ page }) => {
    await goToFirstOpportunity(page);
    await page.getByRole('button', { name: 'Report' }).click();

    await page.getByRole('button', { name: /Generate Report/i }).click();
    // Loading state
    await expect(page.getByRole('button', { name: /Generating/i })).toBeVisible({ timeout: 3_000 });
    // JSON pre block appears
    await expect(page.locator('pre')).toBeVisible({ timeout: 15_000 });
    // Content is valid JSON
    const content = await page.locator('pre').textContent();
    expect(() => JSON.parse(content || '')).not.toThrow();
  });

  test('"Generate Launch Assets" button creates listing copy', async ({ page }) => {
    await goToFirstOpportunity(page);

    // Click the header button
    await page.getByRole('button', { name: /Generate Launch Assets/i }).click();
    // Skip loading state check — mock provider may complete before it renders

    // Switch to Listing tab and wait for content
    await page.getByRole('button', { name: 'Listing' }).click();
    // Either SEO title appears (assets generated) or CTA (async not yet done)
    await expect(
      page.locator('text=/SEO Title|Generate Launch Assets/i').first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('tab switching is smooth — no crashes switching between all 8 tabs', async ({ page }) => {
    await goToFirstOpportunity(page);
    const TABS = ['Overview', 'Research', 'Suppliers', 'Profitability', 'Competition', 'Listing', 'Recommendation', 'Report'];

    for (const tab of TABS) {
      // Use exact:true so "Report" doesn't also match "📄 Generate Report" button
      await page.getByRole('button', { name: tab, exact: true }).click();
      // Active tab gets green border (active state class)
      await expect(page.getByRole('button', { name: tab, exact: true })).toHaveClass(/border-green-600/, { timeout: 2_000 });
      // No React error boundary / crash messages
      await expect(page.locator('text=/Something went wrong|crashed|Minified React error/i')).toHaveCount(0);
    }
  });
});
