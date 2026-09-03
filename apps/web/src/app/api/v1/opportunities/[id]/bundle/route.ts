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

function staticBundles(title: string, category: string, mkt: string) {
  const cat = category.replace(/_/g, ' ') || 'product';
  return {
    bundles: [
      {
        name: `Premium ${title} Starter Kit`,
        products: [title, `${cat} Care Kit`, 'Branded Packaging Box', 'Thank You Card'],
        bundlePrice: '$49.99',
        individualTotal: '$62.00',
        margin: '38%',
        aovLift: '+$18',
        rationale: 'The most popular bundle type — bundles the hero product with care/maintenance items. Reduces competition by creating a unique ASIN not directly comparable to competitors.',
        targetBuyer: 'First-time buyers, gift shoppers',
        competitionLevel: 'Low — unique bundle ASIN',
      },
      {
        name: `${title} Gift Set`,
        products: [title, `${cat} Pouch`, 'Gift Wrapping', 'Personalised Note Card'],
        bundlePrice: '$44.99',
        individualTotal: '$55.00',
        margin: '34%',
        aovLift: '+$14',
        rationale: 'Gift sets command a premium during holidays and peak gifting seasons. Easy to photograph for lifestyle imagery.',
        targetBuyer: 'Gift buyers, seasonal shoppers',
        competitionLevel: 'Low — premium positioning',
      },
      {
        name: `Value 3-Pack ${title}`,
        products: [`${title} x3`, 'Bulk Packaging'],
        bundlePrice: '$34.99',
        individualTotal: '$45.00',
        margin: '42%',
        aovLift: '+$12',
        rationale: 'Multi-packs appeal to repeat buyers and reduce shipping cost per unit. Strong for Subscribe & Save enrollment.',
        targetBuyer: 'Repeat buyers, households',
        competitionLevel: 'Medium — common strategy',
      },
      {
        name: `${title} Complete Collection`,
        products: [title, `${cat} Variant A`, `${cat} Variant B`, 'Storage Bag'],
        bundlePrice: '$79.99',
        individualTotal: '$95.00',
        margin: '36%',
        aovLift: '+$35',
        rationale: 'Premium complete set for buyers who want everything. Highest AOV lift. Works best for fashion, home decor, and lifestyle categories.',
        targetBuyer: 'Enthusiast buyers, collectors',
        competitionLevel: 'Low — highest price point deters imitators',
      },
      {
        name: `${mkt} Bestseller Bundle`,
        products: [title, `Complementary ${cat} Accessory`, 'Quick-Start Guide'],
        bundlePrice: '$39.99',
        individualTotal: '$48.00',
        margin: '33%',
        aovLift: '+$11',
        rationale: `Marketplace-specific bundle optimised for ${mkt} search algorithms. Adding a guide/instructions increases perceived value.`,
        targetBuyer: 'Price-conscious buyers on Amazon',
        competitionLevel: 'Medium',
      },
    ],
  };
}

// GET — load persisted bundle result
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    await ensureSchema(db);
    const r = await db.execute({
      sql: `SELECT content, updatedAt FROM "BundleResult" WHERE opportunityId = ?`,
      args: [params.id],
    });
    if (!r.rows.length) return NextResponse.json(null);
    const row = r.rows[0] as any;
    return NextResponse.json(JSON.parse(String(row.content || 'null')));
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — generate and persist bundle result
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
    return NextResponse.json({ error: 'Sign in to generate bundle strategy', code: 'auth_required' }, { status: 401 });
  }

  try {
    const db = getDb();
    await ensureSchema(db);

    if (!isAdminUser) {
      const cr = await checkAndDeductCredit(userId, 'bundle', db);
      if (!cr.ok) {
        return NextResponse.json(
          { error: 'No credits remaining. Buy 10 credits for $5.', code: 'no_credits' },
          { status: 402 },
        );
      }
    }

    const r = await db.execute({
      sql: `SELECT p.title, p.category, m.code as mCode, m.country as mCountry
            FROM "Opportunity" o
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            WHERE o.id = ?`,
      args: [params.id],
    });
    if (!r.rows.length) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const opp = r.rows[0] as any;

    const title    = String(opp.title    || '');
    const category = String(opp.category || '').replace(/_/g, ' ');
    const mkt      = String(opp.mCode    || '').replace(/_/g, ' ').toUpperCase();
    const country  = String(opp.mCountry || '').toUpperCase();

    const available = PROVIDERS.filter(p =>
      p.available() && (!freeOnly || (FREE_PROVIDER_IDS as readonly string[]).includes(p.id))
    );

    let content: any = staticBundles(title, category, mkt);
    if (available.length) {
      const best = available.sort((a, b) => b.quality - a.quality)[0];
      const result = await tryProvider<any>(best, best.discoveryModel, [
        { role: 'system', content: 'You are an expert eCommerce product bundling strategist. Return ONLY valid JSON.' },
        { role: 'user', content: `Create 5 profitable bundle ideas for:
Product: ${title}
Category: ${category}
Marketplace: ${mkt} (${country})

Return JSON exactly:
{"bundles":[{"name":"...","products":["product1","product2","product3"],"bundlePrice":"$XX.XX","individualTotal":"$XX.XX","margin":"XX%","aovLift":"+$XX","rationale":"...","targetBuyer":"...","competitionLevel":"Low|Medium|High"},{"name":"...","products":[...],"bundlePrice":"...","individualTotal":"...","margin":"...","aovLift":"...","rationale":"...","targetBuyer":"...","competitionLevel":"..."},{"name":"...","products":[...],"bundlePrice":"...","individualTotal":"...","margin":"...","aovLift":"...","rationale":"...","targetBuyer":"...","competitionLevel":"..."},{"name":"...","products":[...],"bundlePrice":"...","individualTotal":"...","margin":"...","aovLift":"...","rationale":"...","targetBuyer":"...","competitionLevel":"..."},{"name":"...","products":[...],"bundlePrice":"...","individualTotal":"...","margin":"...","aovLift":"...","rationale":"...","targetBuyer":"...","competitionLevel":"..."}]}
Make bundles specific and realistic for ${mkt}.` },
      ], { maxTokens: 1200 });
      if (result?.result) content = result.result;
    }

    const now = Date.now();
    const existing = await db.execute({
      sql: `SELECT id FROM "BundleResult" WHERE opportunityId = ?`,
      args: [params.id],
    });
    if (existing.rows.length) {
      await db.execute({
        sql: `UPDATE "BundleResult" SET content=?, updatedAt=? WHERE opportunityId=?`,
        args: [JSON.stringify(content), now, params.id],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO "BundleResult" (id, opportunityId, content, createdAt, updatedAt) VALUES (?,?,?,?,?)`,
        args: [uuidv4(), params.id, JSON.stringify(content), now, now],
      });
    }

    return NextResponse.json(content);
  } catch (err: any) {
    console.error('Bundle generation error:', err);
    return NextResponse.json({ message: 'Bundle generation failed' }, { status: 500 });
  }
}
