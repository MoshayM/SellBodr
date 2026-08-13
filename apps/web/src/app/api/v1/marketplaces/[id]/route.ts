import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const data = await req.json();
    const mp = await db.execute({ sql: 'SELECT * FROM "Marketplace" WHERE id = ?', args: [params.id] });
    if (!mp.rows.length) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const existing = JSON.parse(String(mp.rows[0].feeSchedule || '{}'));
    const feeSchedule = JSON.stringify({
      referralPct: data.referralPct ?? existing.referralPct,
      fbaFeeMinor: data.fbaFeeMinor ?? existing.fbaFeeMinor,
      storageFee:  data.storageFee  ?? existing.storageFee,
    });
    const now = new Date().toISOString();
    await db.execute({ sql: 'UPDATE "Marketplace" SET feeSchedule=?,active=?,updatedAt=? WHERE id=?', args: [feeSchedule, data.active !== undefined ? (data.active ? 1 : 0) : mp.rows[0].active, now, params.id] });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM "Marketplace" WHERE id=?', args: [params.id] });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
  }
}
