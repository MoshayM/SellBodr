import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { jwtVerify } from 'jose';

import { ACCESS_SECRET } from '@/lib/auth-secrets';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(auth, ACCESS_SECRET);
    const orgId = payload.organizationId as string;
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM "Subscription" WHERE organizationId = ?', args: [orgId] });
    if (!result.rows.length) return NextResponse.json({ plan: 'starter', status: 'active' });
    const row = result.rows[0];
    return NextResponse.json({ id: row.id, plan: row.plan, status: row.status, organizationId: row.organizationId });
  } catch {
    return NextResponse.json({ plan: 'starter', status: 'active' });
  }
}
