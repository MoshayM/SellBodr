import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { PROVIDERS, FREE_PROVIDER_IDS, tryProvider } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

const W = { demand: 0.22, margin: 0.20, competition: 0.16, trend: 0.14, marketplaceFit: 0.12, shipping: 0.10, saturation: 0.06 };

function oppScore(s: Record<string, number>): number {
  let base = s.demand * W.demand + s.margin * W.margin + s.competition * W.competition +
             s.trend * W.trend + s.marketplaceFit * W.marketplaceFit + s.shipping * W.shipping +
             s.saturation * W.saturation;
  if (s.margin < 30)         base = Math.min(base, 49);
  if (s.shipping < 25)       base = Math.min(base, 55);
  if (s.marketplaceFit < 30) base = Math.min(base, 45);
  return Math.round(Math.min(100, Math.max(0, base)));
}

function recommend(score: number, marginScore: number): 'launch' | 'hold' | 'reject' {
  if (score >= 70 && marginScore >= 35) return 'launch';
  if (score >= 50) return 'hold';
  return 'reject';
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { payload: tokenPayload } = await jwtVerify(token, ACCESS_SECRET);
    const freeOnly = tokenPayload.role !== 'admin' && tokenPayload.plan !== 'pro';

    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT o.id, o.confidence, p.title, p.category, m.code as mCode, m.country as mCountry,
              s.id as scoreId, s.demand, s.competition, s.margin, s.trend, s.shipping, s.marketplaceFit, s.saturation
            FROM "Opportunity" o
            LEFT JOIN "Product" p      ON o.productId     = p.id
            LEFT JOIN "Marketplace" m  ON o.marketplaceId = m.id
            LEFT JOIN "Score" s        ON s.opportunityId = o.id
            WHERE o.id = ?`,
      args: [params.id],
    });
    if (!r.rows.length) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const opp = r.rows[0] as any;

    const title    = String(opp.title    || '');
    const category = String(opp.category || '').replace(/_/g, ' ');
    const mkt      = String(opp.mCode    || '').replace(/_/g, ' ').toUpperCase();
    const country  = String(opp.mCountry || '').toUpperCase();

    // Current scores as fallback
    const current = {
      demand:        Number(opp.demand        ?? 60),
      competition:   Number(opp.competition   ?? 60),
      margin:        Number(opp.margin        ?? 50),
      trend:         Number(opp.trend         ?? 55),
      shipping:      Number(opp.shipping      ?? 60),
      marketplaceFit:Number(opp.marketplaceFit?? 60),
      saturation:    Number(opp.saturation    ?? 50),
    };

    let scores = current;

    const available = PROVIDERS.filter(p =>
      p.available() && (!freeOnly || (FREE_PROVIDER_IDS as readonly string[]).includes(p.id))
    );

    if (available.length) {
      const best = available.sort((a, b) => b.quality - a.quality)[0];
      const messages = [
        {
          role: 'system' as const,
          content: 'You are an expert cross-border eCommerce analyst. Score opportunities accurately. Return ONLY valid JSON.',
        },
        {
          role: 'user' as const,
          content: `Re-evaluate this cross-border eCommerce opportunity:
Product: ${title}
Category: ${category}
Marketplace: ${mkt} (${country})

Score each dimension 0-100. Higher = better opportunity.
- demand: search volume, buyer interest, purchase frequency
- competition: 100 = low competition (good), 0 = highly saturated
- margin: profitability after landed cost + fees (India source → ${country})
- trend: momentum (growing=high, declining=low)
- shipping: ease/cost of shipping from India to ${country}
- marketplaceFit: how well suited is this product for ${mkt}
- saturation: 100 = niche (good), 0 = fully saturated

Return JSON exactly:
{"demand":0,"competition":0,"margin":0,"trend":0,"shipping":0,"marketplaceFit":0,"saturation":0,"confidence":0,"reasoning":"one sentence"}
All values 0-100. confidence 40-90.`,
        },
      ];

      const result = await tryProvider<any>(best, best.discoveryModel, messages, { maxTokens: 300 });
      if (result?.result && typeof result.result === 'object') {
        const r = result.result;
        scores = {
          demand:         Math.min(100, Math.max(0, Number(r.demand         ?? current.demand))),
          competition:    Math.min(100, Math.max(0, Number(r.competition    ?? current.competition))),
          margin:         Math.min(100, Math.max(0, Number(r.margin         ?? current.margin))),
          trend:          Math.min(100, Math.max(0, Number(r.trend          ?? current.trend))),
          shipping:       Math.min(100, Math.max(0, Number(r.shipping       ?? current.shipping))),
          marketplaceFit: Math.min(100, Math.max(0, Number(r.marketplaceFit ?? current.marketplaceFit))),
          saturation:     Math.min(100, Math.max(0, Number(r.saturation     ?? current.saturation))),
        };
      }
    }

    const opportunity = oppScore(scores);
    const rec         = recommend(opportunity, scores.margin);
    const confidence  = Math.round(40 + Math.random() * 30);
    const now         = Date.now();

    if (opp.scoreId) {
      await db.execute({
        sql: `UPDATE "Score" SET opportunity=?,demand=?,competition=?,margin=?,trend=?,shipping=?,marketplaceFit=?,saturation=?,updatedAt=? WHERE id=?`,
        args: [opportunity, scores.demand, scores.competition, scores.margin, scores.trend, scores.shipping, scores.marketplaceFit, scores.saturation, now, opp.scoreId],
      });
    }

    await db.execute({
      sql: `UPDATE "Opportunity" SET recommendation=?,confidence=?,updatedAt=? WHERE id=?`,
      args: [rec, confidence, now, params.id],
    });

    return NextResponse.json({ ...scores, opportunity, recommendation: rec, confidence });
  } catch (err: any) {
    console.error('Rescore error:', err);
    return NextResponse.json({ message: 'Rescore failed' }, { status: 500 });
  }
}
