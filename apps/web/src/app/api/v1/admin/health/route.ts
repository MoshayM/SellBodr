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
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();

  // ── Searches today ────────────────────────────────────────────────────────
  let scansToday = 0, failedToday = 0, avgLatencyMs = 0;
  try {
    const scanRes = await db.execute({
      sql: `SELECT status, startedAt, completedAt FROM "Search" WHERE createdAt >= ?`,
      args: [dayStart],
    });
    scansToday = scanRes.rows.length;
    failedToday = scanRes.rows.filter((r: any) => r.status === 'failed').length;
    const finished = scanRes.rows.filter((r: any) => r.completedAt && r.startedAt && Number(r.completedAt) > Number(r.startedAt));
    if (finished.length) {
      const latencies = finished.map((r: any) => Number(r.completedAt) - Number(r.startedAt)).sort((a: number, b: number) => a - b);
      const p95idx = Math.floor(latencies.length * 0.95);
      avgLatencyMs = latencies[p95idx] ?? latencies[latencies.length - 1] ?? 0;
    }
  } catch {}

  const errorRate = scansToday > 0 ? failedToday / scansToday : 0;

  // ── Avg opportunity score ─────────────────────────────────────────────────
  let avgScore = 0;
  try {
    const scoreRes = await db.execute({
      sql: `SELECT AVG(opportunity) as avg FROM "Score" WHERE createdAt >= ?`,
      args: [now - 7 * 86400000],
    });
    avgScore = Number((scoreRes.rows[0] as any)?.avg ?? 0);
  } catch {}

  // ── DB connectivity check ─────────────────────────────────────────────────
  let dbOk = true;
  try { await db.execute({ sql: 'SELECT 1', args: [] }); } catch { dbOk = false; }

  // ── Provider keys configured ──────────────────────────────────────────────
  const providers: Record<string, boolean> = {};
  const PROVIDER_ENVS: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai:    'OPENAI_API_KEY',
    groq:      'GROQ_API_KEY',
    mistral:   'MISTRAL_API_KEY',
  };
  for (const [name, envKey] of Object.entries(PROVIDER_ENVS)) {
    providers[name] = !!(process.env[envKey]);
  }
  const providersConfigured = Object.values(providers).filter(Boolean).length;

  // ── Overall status ────────────────────────────────────────────────────────
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let message = 'All systems operational';
  if (!dbOk) { status = 'down'; message = 'Database unreachable'; }
  else if (errorRate > 0.2) { status = 'degraded'; message = `High error rate: ${(errorRate * 100).toFixed(0)}% of today's scans failed`; }
  else if (errorRate > 0.05) { status = 'degraded'; message = `Elevated error rate: ${(errorRate * 100).toFixed(0)}% failure rate today`; }
  else if (providersConfigured === 0) { status = 'degraded'; message = 'No AI provider keys configured'; }

  // Uptime: approximate from process start (not available in serverless; use a fixed message)
  const uptime = 'Serverless';

  return NextResponse.json({
    status,
    message,
    uptime,
    scansToday,
    avgScore: avgScore || null,
    pipelineP95ms: avgLatencyMs || null,
    errorRate,
    db: { connected: dbOk },
    agents: {
      anthropic_claude: { healthy: providers.anthropic, label: 'Anthropic Claude' },
      openai_gpt4:      { healthy: providers.openai,    label: 'OpenAI GPT-4' },
      groq_llama:       { healthy: providers.groq,      label: 'Groq / Llama' },
      mistral:          { healthy: providers.mistral,   label: 'Mistral' },
    },
  });
}
