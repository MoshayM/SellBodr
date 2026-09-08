import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const RL_WINDOW_MS = 60 * 60 * 1000;
const RL_MAX = 5;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const db = getDb();
    await ensureSchema(db);

    // Rate limit per IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey = `forgot:${ip}`;
    const rlNow = Date.now();
    const resetAt = rlNow + RL_WINDOW_MS;
    await db.execute({
      sql: `INSERT INTO "RateLimit" (key, count, resetAt) VALUES (?, 1, ?)
            ON CONFLICT (key) DO UPDATE SET
              count   = CASE WHEN "RateLimit".resetAt < ? THEN 1 ELSE "RateLimit".count + 1 END,
              resetAt = CASE WHEN "RateLimit".resetAt < ? THEN ? ELSE "RateLimit".resetAt END`,
      args: [rlKey, resetAt, rlNow, rlNow, resetAt],
    });
    const rl = await db.execute({ sql: 'SELECT count FROM "RateLimit" WHERE key = ?', args: [rlKey] });
    if (Number(rl.rows[0]?.count ?? 0) > RL_MAX) {
      return NextResponse.json({ message: 'Too many requests. Try again later.' }, { status: 429 });
    }

    // Look up user — respond the same way whether found or not (enumeration protection)
    const result = await db.execute({ sql: 'SELECT id, name FROM "User" WHERE email = ? AND deletedAt IS NULL', args: [email] });

    if (result.rows.length > 0) {
      const user = result.rows[0] as any;
      const rawToken = randomBytes(48).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
      const now = Date.now();

      // Invalidate any previous tokens for this user
      await db.execute({ sql: 'DELETE FROM "PasswordResetToken" WHERE userId = ?', args: [user.id] });

      await db.execute({
        sql: 'INSERT INTO "PasswordResetToken" (id, userId, tokenHash, expiresAt, createdAt) VALUES (?,?,?,?,?)',
        args: [uuidv4(), user.id, tokenHash, expiresAt, now],
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sellbodr.vercel.app';
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
      const resendKey = process.env.RESEND_API_KEY;

      if (resendKey) {
        const resend = new Resend(resendKey);
        const sendResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: email,
          subject: 'Reset your SellBodr password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
              <div style="text-align:center;margin-bottom:24px">
                <span style="font-size:24px;font-weight:900;background:linear-gradient(135deg,#7c3aed,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent">SellBodr</span>
              </div>
              <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px">Reset your password</h2>
              <p style="color:#64748b;margin:0 0 24px">Hi ${user.name || 'there'},<br><br>
                We received a request to reset the password for your SellBodr account.
                Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <a href="${resetUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;text-decoration:none;font-weight:700;padding:14px 32px;border-radius:10px;font-size:15px">
                Reset Password
              </a>
              <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">
                If you didn't request this, you can ignore this email — your password won't change.<br><br>
                Or copy this link: <a href="${resetUrl}" style="color:#7c3aed;word-break:break-all">${resetUrl}</a>
              </p>
            </div>
          `,
        });
        if (sendResult.error) {
          console.error('[forgot-password] Resend error:', JSON.stringify(sendResult.error));
        } else {
          console.log('[forgot-password] Email sent, id:', sendResult.data?.id);
        }
      } else {
        console.warn('[forgot-password] RESEND_API_KEY not set — skipping email send');
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
