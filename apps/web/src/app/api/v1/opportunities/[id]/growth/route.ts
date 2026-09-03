import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { checkAndDeductCredit } from '@/lib/credits';
import { PROVIDERS, FREE_PROVIDER_IDS, tryProvider } from '@/lib/ai/gateway';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

function staticPlaybook(title: string, category: string, mkt: string, rec: string) {
  return {
    quickWins: [
      `Optimize your ${title} listing title with top 3 search keywords in the first 80 characters.`,
      'Add at least 6 high-resolution images (min 1500×1500px) with white background for main image.',
      'Set a launch price 10–15% below the average competitor to accelerate initial reviews.',
      'Enroll in FBA/fulfillment program to unlock Prime badge and boost organic ranking.',
      'Use A+ Content / Enhanced Brand Content to add comparison charts and lifestyle images.',
    ],
    listingOptimization: {
      title: `Include primary keyword + key benefit + size/variant. Example: "[Keyword] ${title} — [Key Benefit] for [Use Case]"`,
      bullets: [
        'Bullet 1: Lead with the #1 customer benefit (not a feature)',
        'Bullet 2: Address the top customer concern / objection',
        'Bullet 3: Include materials/quality certifications',
        'Bullet 4: Mention compatibility or use cases',
        'Bullet 5: Highlight warranty / satisfaction guarantee',
      ],
      images: [
        'Main: White background, product fills 85% of frame',
        'Lifestyle: Product in real-world use by target demographic',
        'Infographic: Key features/specs with callouts',
        'Size chart or dimension diagram',
        'Before/after or comparison shot',
        'Packaging shot (for gift-ability appeal)',
      ],
      video: `60–90 second product showcase video increases conversion by 20–35% on ${mkt}.`,
    },
    pricingStrategy: {
      launch: 'Price 10–15% below market average for first 30 days to build velocity and reviews.',
      steady: 'Gradually increase price by 5% every 2 weeks once you hit 15+ reviews.',
      promo: 'Run a 20% Lightning Deal or Coupon during peak season to spike BSR ranking.',
      international: 'Price in local currency, never just convert — research local price sensitivity.',
    },
    reviewStrategy: [
      "Use the marketplace's Request a Review button for every order (automated tools like Helium10 help).",
      'Insert a product card in packaging: "Love it? Share your experience" + QR code to review page.',
      'Respond to every review (positive and negative) within 24 hours — boosts algorithm trust.',
      `Target 20+ reviews in first 60 days — this is the conversion tipping point on ${mkt}.`,
      'Never incentivize or offer discounts for reviews — violates marketplace ToS.',
    ],
    launchSequence: [
      { week: 'Week 1', action: 'Publish listing, set 10% below market price, run internal testing order.' },
      { week: 'Week 2', action: 'Launch PPC broad match campaign ($10/day). Enable Sponsored Products.' },
      { week: 'Week 3', action: 'Analyze search term reports. Shift budget to best-performing exact match keywords.' },
      { week: 'Week 4', action: 'Request reviews from all orders. Enable Lightning Deal if eligible.' },
      { week: 'Month 2', action: 'Increase price by 5%. Expand to competitor targeting campaigns.' },
      { week: 'Month 3', action: 'A/B test listing images and title. Expand to additional marketplaces.' },
    ],
    ppcStrategy: {
      budget: '$10–20/day for launch phase (first 30 days)',
      campaigns: [
        'Auto campaign: Discover converting keywords (lower bid, max impressions)',
        'Exact match campaign: Target top 10 proven keywords with aggressive bids',
        'Competitor campaign: Target top 3 competitor ASINs',
        'Brand defence: Bid on your own product name to protect organic rank',
      ],
      acos: `Target ACoS ≤ 30% for ${rec === 'launch' ? 'this high-potential product' : 'this product until ranking improves'}.`,
    },
    monthlyMilestones: [
      { month: 1, goal: '10–20 reviews, break even on PPC, achieve page 1 ranking for 1 main keyword' },
      { month: 2, goal: 'Profitable PPC, 30+ reviews, expand keyword portfolio' },
      { month: 3, goal: 'Reduce ACoS to <25%, consider 2nd marketplace expansion, A+ content live' },
      { month: 6, goal: 'Consistent BSR in top 1%, explore brand registry, add product variations' },
    ],
  };
}

// GET — load persisted growth playbook
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await ensureSchema(db);
    const r = await db.execute({
      sql: `SELECT content FROM "GrowthPlaybook" WHERE opportunityId = ?`,
      args: [params.id],
    });
    if (!r.rows.length) return NextResponse.json(null);
    return NextResponse.json(JSON.parse(String((r.rows[0] as any).content || 'null')));
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let freeOnly = true;
  let isAdminUser = false;
  let userId = '';
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (token) {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      isAdminUser = payload.role === 'admin';
      freeOnly    = !isAdminUser && payload.plan !== 'pro';
      if (!isAdminUser) userId = String(payload.sub ?? '');
    } catch { }
  }

  if (!isAdminUser && !userId) {
    return NextResponse.json({ error: 'Sign in to generate growth strategy', code: 'auth_required' }, { status: 401 });
  }

  try {
    const db = getDb();
    await ensureSchema(db);

    if (!isAdminUser) {
      const cr = await checkAndDeductCredit(userId, 'growth', db);
      if (!cr.ok) {
        return NextResponse.json(
          { error: 'No credits remaining. Buy 10 credits for $5.', code: 'no_credits' },
          { status: 402 },
        );
      }
    }

    const r = await db.execute({
      sql: `SELECT o.*, p.title, p.category, m.code as mCode, m.country as mCountry,
              s.opportunity as oppScore, s.demand, s.competition, s.margin as marginScore, s.trend
            FROM "Opportunity" o
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            LEFT JOIN "Score" s ON s.opportunityId = o.id
            WHERE o.id = ?`,
      args: [params.id],
    });

    if (!r.rows.length) return NextResponse.json({ message: 'Opportunity not found' }, { status: 404 });
    const opp = r.rows[0] as any;

    const title = String(opp.title || '');
    const category = String(opp.category || '').replace(/_/g, ' ');
    const mkt = String(opp.mCode || '').replace(/_/g, ' ').toUpperCase();
    const rec = String(opp.recommendation || 'hold');

    // Check cache (valid for 48h)
    const cached = await db.execute({
      sql: 'SELECT content, updatedAt FROM "GrowthPlaybook" WHERE opportunityId = ?',
      args: [params.id],
    });
    if (cached.rows.length) {
      const age = Date.now() - Number((cached.rows[0] as any).updatedAt || 0);
      if (age < 48 * 60 * 60 * 1000) {
        return NextResponse.json(JSON.parse(String((cached.rows[0] as any).content)));
      }
    }

    const available = PROVIDERS.filter(p =>
      p.available() && (!freeOnly || (FREE_PROVIDER_IDS as readonly string[]).includes(p.id))
    );
    if (!available.length) {
      return NextResponse.json(staticPlaybook(title, category, mkt, rec));
    }

    const best = available.sort((a, b) => b.quality - a.quality)[0];
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a top eCommerce growth strategist specializing in cross-border selling. Create specific, actionable growth playbooks. Return ONLY valid JSON.',
      },
      {
        role: 'user' as const,
        content: `Create a personalized growth playbook for:
Product: ${title}
Category: ${category}
Marketplace: ${mkt} (${opp.mCountry?.toUpperCase()})
Opportunity Score: ${Math.round(Number(opp.oppScore) || 0)}/100
Demand Score: ${Math.round(Number(opp.demand) || 0)}/100
Competition Score: ${Math.round(Number(opp.competition) || 0)}/100
Margin Score: ${Math.round(Number(opp.marginScore) || 0)}/100
Trend Score: ${Math.round(Number(opp.trend) || 0)}/100
Recommendation: ${rec.toUpperCase()}

Return JSON exactly:
{
  "quickWins": ["action1","action2","action3","action4","action5"],
  "listingOptimization": {"title":"...","bullets":["b1","b2","b3","b4","b5"],"images":["i1","i2","i3","i4","i5","i6"],"video":"..."},
  "pricingStrategy": {"launch":"...","steady":"...","promo":"...","international":"..."},
  "reviewStrategy": ["tip1","tip2","tip3","tip4","tip5"],
  "launchSequence": [{"week":"Week 1","action":"..."},{"week":"Week 2","action":"..."},{"week":"Week 3","action":"..."},{"week":"Week 4","action":"..."},{"week":"Month 2","action":"..."},{"week":"Month 3","action":"..."}],
  "ppcStrategy": {"budget":"...","campaigns":["c1","c2","c3","c4"],"acos":"..."},
  "monthlyMilestones": [{"month":1,"goal":"..."},{"month":2,"goal":"..."},{"month":3,"goal":"..."},{"month":6,"goal":"..."}]
}
Be specific to the product and marketplace. Use concrete numbers and timelines.`,
      },
    ];

    const result = await tryProvider<any>(best, best.discoveryModel, messages, { maxTokens: 1500 });
    const content = result?.result ?? staticPlaybook(title, category, mkt, rec);

    // Cache result
    const now = Date.now();
    if (cached.rows.length) {
      await db.execute({
        sql: 'UPDATE "GrowthPlaybook" SET content=?, updatedAt=? WHERE opportunityId=?',
        args: [JSON.stringify(content), now, params.id],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO "GrowthPlaybook" (id, opportunityId, content, createdAt, updatedAt) VALUES (?,?,?,?,?)',
        args: [uuidv4(), params.id, JSON.stringify(content), now, now],
      });
    }

    return NextResponse.json(content);
  } catch (err: any) {
    console.error('Growth playbook error:', err);
    return NextResponse.json({ message: 'Growth playbook generation failed' }, { status: 500 });
  }
}
