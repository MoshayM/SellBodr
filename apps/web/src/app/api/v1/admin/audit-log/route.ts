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

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 50), 500);

  const db = getDb();
  await ensureSchema(db);

  const res = await db.execute({
    sql: `SELECT
            a.id, a.action, a.resource, a.resourceType, a.resourceId, a.createdAt,
            actor.email AS userEmail,
            target.email AS targetEmail
          FROM "AuditLog" a
          LEFT JOIN "User" actor ON actor.id = a.actorUserId
          LEFT JOIN "User" target ON target.id = a.userId
          ORDER BY a.createdAt DESC
          LIMIT ?`,
    args: [limit],
  });

  const entries = res.rows.map((row: any) => {
    let metadata: Record<string, unknown> = {};
    try { if (row.resource) metadata = JSON.parse(String(row.resource)); } catch {}
    return {
      id:          row.id,
      action:      row.action,
      userEmail:   row.userEmail  ?? null,
      targetEmail: row.targetEmail ?? null,
      resourceType: row.resourceType ?? null,
      resourceId:   row.resourceId ?? null,
      metadata,
      createdAt:   Number(row.createdAt),
    };
  });

  return NextResponse.json(entries);
}
