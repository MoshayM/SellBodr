import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload.role === 'admin';
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  await ensureSchema(db);
  const now = Date.now();
  const DAY = 86400000;

  // ── Settings for price calculations ──────────────────────────────────────
  const settingsRes = await db.execute({ sql: `SELECT key, value FROM "PlatformSettings"`, args: [] });
  const settings: Record<string, number> = {};
  for (const row of settingsRes.rows) settings[String(row.key)] = Number(row.value);
  const proPrice      = settings.pro_price_usd           ?? 18;
  const bundlePrice   = settings.credit_bundle_price_usd ?? 5;
  const bundleSize    = settings.credit_bundle_size       ?? 10;

  // ── Users ─────────────────────────────────────────────────────────────────
  const usersRes = await db.execute({
    sql: `SELECT id, plan, role, createdAt, lastLoginAt, credits FROM "User" WHERE deletedAt IS NULL`,
    args: [],
  });
  const users = usersRes.rows as any[];
  const totalUsers   = users.length;
  const proUsers     = users.filter(u => u.plan === 'pro').length;
  const adminUsers   = users.filter(u => u.role === 'admin').length;
  const newUsers7d   = users.filter(u => now - Number(u.createdAt || 0) < 7  * DAY).length;
  const newUsers30d  = users.filter(u => now - Number(u.createdAt || 0) < 30 * DAY).length;
  const activeUsers30d = users.filter(u => now - Number(u.lastLoginAt || u.createdAt || 0) < 30 * DAY).length;
  const churnedUsers = users.filter(u => u.plan !== 'pro' && now - Number(u.createdAt || 0) > 30 * DAY && now - Number(u.lastLoginAt || 0) > 30 * DAY).length;

  // ── Revenue ───────────────────────────────────────────────────────────────
  const mrr = proUsers * proPrice;
  const arr = mrr * 12;
  const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : '0.0';
  const churnRate = totalUsers > 0 ? ((churnedUsers / totalUsers) * 100).toFixed(1) : '0.0';

  // ── Credits ───────────────────────────────────────────────────────────────
  let creditsPurchased = 0, creditsConsumed = 0;
  try {
    const ctRes = await db.execute({ sql: `SELECT type, amount FROM "CreditTransaction"`, args: [] });
    for (const row of ctRes.rows as any[]) {
      if (row.type === 'purchase') creditsPurchased += Number(row.amount);
      else creditsConsumed += Math.abs(Number(row.amount));
    }
  } catch {}
  const creditPurchaseTxns = Math.ceil(creditsPurchased / bundleSize);
  const creditRevenue = creditPurchaseTxns * bundlePrice;
  const totalRevenue = mrr + creditRevenue;

  // ── Searches ──────────────────────────────────────────────────────────────
  let totalSearches = 0;
  const searchesByDay: { date: string; count: number }[] = [];
  const marketplaceCounts: Record<string, number> = {};
  try {
    const sRes = await db.execute({
      sql: `SELECT marketplace, createdAt FROM "Search" WHERE status != 'failed' ORDER BY createdAt DESC`,
      args: [],
    });
    totalSearches = sRes.rows.length;

    // Build last 30 days
    const dayCounts: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      const key = d.toISOString().slice(0, 10);
      dayCounts[key] = 0;
    }
    for (const row of sRes.rows as any[]) {
      const d = new Date(Number(row.createdAt || 0)).toISOString().slice(0, 10);
      if (dayCounts[d] !== undefined) dayCounts[d]++;
      const mp = String(row.marketplace || 'unknown').toUpperCase();
      marketplaceCounts[mp] = (marketplaceCounts[mp] ?? 0) + 1;
    }
    for (const [date, count] of Object.entries(dayCounts)) {
      searchesByDay.push({ date, count });
    }
  } catch {}

  const topMarketplaces = Object.entries(marketplaceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // ── User growth by day (last 30d) ─────────────────────────────────────────
  const userGrowthByDay: { date: string; count: number }[] = [];
  try {
    const dayUserCounts: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      dayUserCounts[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of users) {
      const d = new Date(Number(u.createdAt || 0)).toISOString().slice(0, 10);
      if (dayUserCounts[d] !== undefined) dayUserCounts[d]++;
    }
    for (const [date, count] of Object.entries(dayUserCounts)) {
      userGrowthByDay.push({ date, count });
    }
  } catch {}

  // ── Avg credits per user ──────────────────────────────────────────────────
  const totalCurrentCredits = users.reduce((s, u) => s + Number(u.credits ?? 0), 0);
  const avgCreditsPerUser   = totalUsers > 0 ? (totalCurrentCredits / totalUsers).toFixed(1) : '0';

  return NextResponse.json({
    // Users
    totalUsers, proUsers, adminUsers, newUsers7d, newUsers30d, activeUsers30d, churnedUsers,
    conversionRate, churnRate,
    // Revenue
    mrr, arr, totalRevenue, creditRevenue,
    proPrice, bundlePrice, bundleSize,
    // Credits
    creditsPurchased, creditsConsumed, creditPurchaseTxns,
    totalCurrentCredits, avgCreditsPerUser,
    // Activity
    totalSearches,
    avgSearchesPerUser: totalUsers > 0 ? (totalSearches / totalUsers).toFixed(1) : '0',
    // Charts
    searchesByDay, userGrowthByDay, topMarketplaces,
  });
}
