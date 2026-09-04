import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDb();
    await ensureSchema(db);
    const res = await db.execute({ sql: `SELECT key, value FROM "PlatformSettings"`, args: [] });
    const settings: Record<string, string> = {};
    for (const row of res.rows) settings[String(row.key)] = String(row.value);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({
      pro_price_usd: '18',
      credit_bundle_size: '10',
      credit_bundle_price_usd: '5',
      free_scan_limit: '5',
      free_results_per_scan: '8',
      free_supplier_cap: '10',
    });
  }
}
