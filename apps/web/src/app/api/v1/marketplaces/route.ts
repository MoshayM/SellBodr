import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    const sql = activeOnly
      ? 'SELECT * FROM "Marketplace" WHERE active = 1 ORDER BY code ASC'
      : 'SELECT * FROM "Marketplace" ORDER BY code ASC';
    const result = await db.execute(sql);
    const rows = result.rows.map(r => ({
      id: r.id, code: r.code, country: r.country, currency: r.currency,
      feeSchedule: r.feeSchedule, active: Boolean(r.active),
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    }));
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('Marketplaces GET error:', err);
    return NextResponse.json({ message: 'Failed to fetch marketplaces' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, country, currency, referralPct = 15, fbaFeeMinor = 0, storageFee = 0 } = await req.json();
    if (!code || !country || !currency) return NextResponse.json({ message: 'code, country, currency required' }, { status: 400 });
    const db = getDb();
    const clean = code.toLowerCase().replace(/\s+/g, '_');
    const now = new Date().toISOString();
    const id  = uuidv4();
    const feeSchedule = JSON.stringify({ referralPct, fbaFeeMinor, storageFee });
    await db.execute({ sql: 'INSERT INTO "Marketplace" (id,code,country,currency,feeSchedule,active,createdAt,updatedAt) VALUES (?,?,?,?,?,1,?,?)', args: [id, clean, country, currency.toUpperCase(), feeSchedule, now, now] });
    return NextResponse.json({ id, code: clean, country, currency: currency.toUpperCase(), feeSchedule, active: true }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) return NextResponse.json({ message: 'Marketplace already exists' }, { status: 409 });
    return NextResponse.json({ message: 'Failed to create marketplace' }, { status: 500 });
  }
}
