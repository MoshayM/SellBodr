import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawRefresh: string | undefined = body?.refreshToken;

    if (rawRefresh) {
      const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
      const db = getDb();
      await ensureSchema(db);
      await db.execute({
        sql:  'UPDATE "RefreshToken" SET revoked = 1 WHERE tokenHash = ?',
        args: [tokenHash],
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail logout from the client's perspective
    return NextResponse.json({ ok: true });
  }
}
