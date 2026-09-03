import type { Client } from '@libsql/client';

export const CREDITS_PER_PACK = 10;
export const PACK_PRICE_USD   = 5;

export type CreditResult =
  | { ok: true; remaining: number }
  | { ok: false; error: 'no_credits' | 'auth_required'; remaining: number };

export async function checkAndDeductCredit(
  userId: string,
  reason: string,
  db: Client,
): Promise<CreditResult> {
  const r = await db.execute({ sql: `SELECT credits FROM "User" WHERE id = ?`, args: [userId] });
  const remaining = Number((r.rows[0] as any)?.credits ?? 0);
  if (remaining <= 0) return { ok: false, error: 'no_credits', remaining: 0 };

  // Atomic decrement — WHERE credits > 0 guards against race conditions
  const upd = await db.execute({
    sql: `UPDATE "User" SET credits = credits - 1, updatedAt = ? WHERE id = ? AND credits > 0`,
    args: [Date.now(), userId],
  });
  if ((upd.rowsAffected ?? 0) === 0) return { ok: false, error: 'no_credits', remaining: 0 };

  await db.execute({
    sql: `INSERT INTO "CreditTransaction" (id, userId, type, amount, reason, createdAt) VALUES (?, ?, 'deduct', -1, ?, ?)`,
    args: [crypto.randomUUID(), userId, reason, Date.now()],
  });

  return { ok: true, remaining: remaining - 1 };
}
