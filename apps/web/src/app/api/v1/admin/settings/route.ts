import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
);

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.role !== 'admin') return null;
    return String(payload.sub ?? '');
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  await ensureSchema(db);
  const res = await db.execute({ sql: `SELECT key, value FROM "PlatformSettings"`, args: [] });
  const settings: Record<string, string> = {};
  for (const row of res.rows) settings[String(row.key)] = String(row.value);
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const db = getDb();
  await ensureSchema(db);
  const now = Date.now();
  const ALLOWED = ['pro_price_usd','credit_bundle_size','credit_bundle_price_usd','free_scan_limit','free_results_per_scan','free_supplier_cap'];
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED.includes(key)) continue;
    await db.execute({
      sql: `INSERT INTO "PlatformSettings" (key, value, updatedAt) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
      args: [key, String(value), now],
    });
  }
  return NextResponse.json({ ok: true });
}
