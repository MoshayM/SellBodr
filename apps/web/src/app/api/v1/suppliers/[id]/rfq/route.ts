import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { PROVIDERS, tryProvider } from '@/lib/ai/gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

function buildStaticRfq(supplier: any, product: any, marketplace: any) {
  const qty = (Number(supplier.moq) || 100) * 2;
  const price = ((Number(supplier.productCostMinor) || 10000) / 100).toFixed(0);
  const targetPrice = ((Number(supplier.productCostMinor) * 0.82) / 100).toFixed(0);
  const mkt = marketplace?.code?.replace(/_/g, ' ').toUpperCase() || 'international marketplace';
  const country = marketplace?.country?.toUpperCase() || 'global markets';

  const subject = `Bulk Purchase Inquiry — ${product?.title || 'Product'} | Export Quality Required`;
  const body = `Dear ${supplier.supplierName} Team,

We are eCommerce exporters actively selling on ${mkt} (${country}) and are interested in sourcing your ${product?.title || 'product'} for our international business.

REQUIREMENTS:
• Initial Order Quantity: ${qty} units
• Target Price: ₹${targetPrice}/unit (currently reviewing multiple suppliers at ₹${price}/unit)
• Packaging: Export-ready, internationally compliant
• Quality: International export standard

REQUEST:
1. Your best price for ${qty} units — we aim for long-term, repeat orders
2. Sample availability & cost (will deduct from first bulk order)
3. Confirmed lead time for bulk production
4. Payment terms (T/T, LC, advance options)
5. Export certifications available (ISO, BIS, CE, etc.)

We are scaling our India-sourced catalogue and prefer suppliers who can grow with us. If pricing and quality align, we plan quarterly orders with 3–5× volume growth within 12 months.

Looking forward to your response within 48 hours.

Warm regards,
[Your Name]
SellBodr Export Team`;

  const whatsappMessage = `Hi ${supplier.supplierName}! Interested in sourcing ${product?.title || 'your product'} for ${mkt}. Need ${qty} units @ ₹${targetPrice}/unit. Can we discuss bulk pricing? Please share best offer + lead time. Thank you!`;

  return { subject, body, whatsappMessage };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    await jwtVerify(token, ACCESS_SECRET);

    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT sc.*,
              p.title as pTitle, p.category as pCategory,
              m.code as mCode, m.country as mCountry, m.currency as mCurrency
            FROM "SourcingCandidate" sc
            LEFT JOIN "Opportunity" o ON sc.opportunityId = o.id
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            WHERE sc.id = ?`,
      args: [params.id],
    });

    if (!r.rows.length) return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    const sc = r.rows[0] as any;

    const supplier = { supplierName: sc.supplierName, moq: sc.moq, productCostMinor: sc.productCostMinor };
    const product  = { title: sc.pTitle, category: sc.pCategory };
    const marketplace = { code: sc.mCode, country: sc.mCountry, currency: sc.mCurrency };

    const qty          = (Number(sc.moq) || 100) * 2;
    const price        = ((Number(sc.productCostMinor) || 10000) / 100).toFixed(0);
    const targetPrice  = ((Number(sc.productCostMinor) * 0.82) / 100).toFixed(0);
    const mkt          = sc.mCode?.replace(/_/g, ' ').toUpperCase() || 'international marketplace';

    const available = PROVIDERS.filter(p => p.available());
    if (!available.length) {
      return NextResponse.json(buildStaticRfq(supplier, product, marketplace));
    }

    const best = available.sort((a, b) => b.quality - a.quality)[0];
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a professional trade negotiation assistant. Generate concise, professional RFQ messages. Return ONLY valid JSON.',
      },
      {
        role: 'user' as const,
        content: `Generate an RFQ (Request for Quotation) for:
Supplier: ${sc.supplierName}
Product: ${sc.pTitle} (Category: ${sc.pCategory})
Target Marketplace: ${mkt} (${sc.mCountry?.toUpperCase()})
Current Listed Price: ₹${price}/unit
Required Initial Quantity: ${qty} units
Target Price: ₹${targetPrice}/unit (18% below listed)

Return JSON exactly: {"subject":"...","body":"...","whatsappMessage":"..."}
- body: formal email (300-400 words), professional tone, firm on price negotiation, mention long-term partnership angle
- whatsappMessage: casual but professional (max 350 characters)`,
      },
    ];

    const result = await tryProvider<{ subject: string; body: string; whatsappMessage: string }>(
      best, best.discoveryModel, messages, { maxTokens: 600 }
    );

    if (!result) return NextResponse.json(buildStaticRfq(supplier, product, marketplace));
    return NextResponse.json(result.result);
  } catch (err: any) {
    if (err.message === 'Unauthorized' || err?.code?.startsWith('ERR_JWT')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.error('RFQ generation error:', err);
    return NextResponse.json({ message: 'RFQ generation failed' }, { status: 500 });
  }
}
