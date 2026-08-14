import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, 'playwright/.auth/user.json');
const TEST_EMAIL = 'e2e-fixed@SellBodr.test';
const TEST_PASSWORD = 'TestPass123!';

setup('create or restore test user session', async ({ page }) => {
  setup.setTimeout(180_000);

  // Use relative paths — Playwright resolves them against the configured baseURL
  const API = '/api/v1';

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 30_000 });
  // Small buffer on first load (cold start / compilation)
  await page.waitForTimeout(2_000);

  async function tryLogin() {
    return page.request.post(`${API}/auth/login`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);
  }

  let loginRes = await tryLogin();
  if (!loginRes || loginRes.status() >= 500) {
    console.log(`Login attempt 1 failed (${loginRes?.status() ?? 'network error'}) — waiting 3s and retrying…`);
    await page.waitForTimeout(3_000);
    loginRes = await tryLogin();
  }

  let authData: any = null;

  if (loginRes && loginRes.ok()) {
    authData = await loginRes.json();
  } else {
    const regRes = await page.request.post(`${API}/auth/register`, {
      data: { name: 'E2E Tester', email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (!regRes || !regRes.ok()) {
      const regStatus = regRes ? regRes.status() : 'network error';
      const err = regRes ? await regRes.json().catch(() => ({ message: 'unknown' })) : { message: 'network error' };
      throw new Error(`Registration failed (${regStatus}): ${err.message}`);
    }
    authData = await regRes.json();
  }

  // Store Groq key in DB so the settings UI shows it as configured.
  // Gateway reads from GROQ_API_KEY env var directly; this PUT is cosmetic only.
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    await page.request.put(`${API}/settings/ai-provider-keys`, {
      data: { groq: groqKey },
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.accessToken}` },
    }).catch((err) => console.warn('Groq key DB store skipped:', err));
  }

  await page.evaluate((data) => {
    if (data.accessToken)  localStorage.setItem('bs_access_token',  data.accessToken);
    if (data.refreshToken) localStorage.setItem('bs_refresh_token', data.refreshToken);
    if (data.user)         localStorage.setItem('bs_user', JSON.stringify(data.user));
  }, authData);

  await page.goto('/opportunities');
  await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible({ timeout: 30_000 });

  // Pre-seed opportunities so data-dependent tests don't need to call AI themselves
  const oppsCheck = await page.request.get(`${API}/opportunities?marketplace=amazon_us`, {
    headers: { 'Authorization': `Bearer ${authData.accessToken}` },
    timeout: 15_000,
  }).catch(() => null);

  let oppsExist = false;
  if (oppsCheck && oppsCheck.ok()) {
    const opps = await oppsCheck.json().catch(() => []);
    oppsExist = Array.isArray(opps) && opps.length > 0;
  }

  if (!oppsExist) {
    console.log('No opportunities in DB — seeding via Groq search…');
    const searchRes = await page.request.post(`${API}/searches`, {
      data: { marketplace: 'amazon_us' },
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.accessToken}` },
      timeout: 60_000,
    }).catch(() => null);

    if (searchRes && searchRes.ok()) {
      const sd = await searchRes.json().catch(() => null);
      console.log(`Pre-seeded ${sd?.count ?? '?'} opportunities via Groq`);
    } else {
      const status = searchRes ? searchRes.status() : 'network error';
      console.log(`Groq search failed (${status}) — trying dev seed endpoint…`);

      const seedRes = await page.request.post(`${API}/test/seed`, {
        data: { marketplace: 'amazon_us' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      }).catch(() => null);

      if (seedRes && seedRes.ok()) {
        const sd = await seedRes.json().catch(() => null);
        console.log(`Pre-seeded ${sd?.count ?? '?'} mock opportunities`);
      } else {
        const seedStatus = seedRes ? seedRes.status() : 'network error';
        const seedBody = seedRes ? await seedRes.json().catch(() => null) : null;
        console.warn(`All seeding failed (${seedStatus}): ${JSON.stringify(seedBody)} — data-dependent tests will use per-test Groq fallback`);
      }
    }
  } else {
    console.log('Opportunities already in DB — skipping pre-seed');
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
