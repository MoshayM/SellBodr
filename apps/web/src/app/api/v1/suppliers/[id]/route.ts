import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getDb } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me');

// Trust score by platform (0-100)
const SOURCE_TRUST: Record<string, number> = {
  indiamart: 85, tradeindia: 78, exportersindia: 72,
  alibaba: 92, dhgate: 68, 'made-in-china': 74, globalsources: 88,
  faire: 90, europages: 80,
};

// Global city→country for non-India suppliers
const GLOBAL_CITY_COUNTRY: Record<string, { state: string; country: string; lat: number; lon: number }> = {
  'Guangzhou': { state: 'Guangdong', country: 'China',     lat: 23.1291, lon: 113.2644 },
  'Shenzhen':  { state: 'Guangdong', country: 'China',     lat: 22.5431, lon: 114.0579 },
  'Shanghai':  { state: 'Shanghai',  country: 'China',     lat: 31.2304, lon: 121.4737 },
  'Yiwu':      { state: 'Zhejiang',  country: 'China',     lat: 29.3064, lon: 120.0644 },
  'Hong Kong': { state: '',          country: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
};

const CITY_STATE: Record<string, string> = {
  Jaipur: 'Rajasthan', Moradabad: 'Uttar Pradesh', Jodhpur: 'Rajasthan',
  Surat: 'Gujarat', Tiruppur: 'Tamil Nadu', Ludhiana: 'Punjab',
  Mumbai: 'Maharashtra', Ahmedabad: 'Gujarat', Kannauj: 'Uttar Pradesh',
  Bangalore: 'Karnataka', Noida: 'Uttar Pradesh', Chennai: 'Tamil Nadu',
  Hyderabad: 'Telangana', Delhi: 'Delhi', Agra: 'Uttar Pradesh',
  Varanasi: 'Uttar Pradesh', Jalandhar: 'Punjab', Meerut: 'Uttar Pradesh',
  Amritsar: 'Punjab', Kanpur: 'Uttar Pradesh', Saharanpur: 'Uttar Pradesh',
  Nagpur: 'Maharashtra', Pune: 'Maharashtra', Kolkata: 'West Bengal',
};

const CITY_COORDS: Record<string, [number, number]> = {
  Jaipur: [26.9124, 75.7873], Moradabad: [28.8386, 78.7733], Jodhpur: [26.2389, 73.0243],
  Surat: [21.1702, 72.8311], Tiruppur: [11.1085, 77.3411], Ludhiana: [30.9010, 75.8573],
  Mumbai: [19.0760, 72.8777], Ahmedabad: [23.0225, 72.5714], Kannauj: [27.0566, 79.9245],
  Bangalore: [12.9716, 77.5946], Noida: [28.5355, 77.3910], Chennai: [13.0827, 80.2707],
  Hyderabad: [17.3850, 78.4867], Delhi: [28.6139, 77.2090], Agra: [27.1767, 78.0081],
  Varanasi: [25.3176, 82.9739], Jalandhar: [31.3260, 75.5762], Meerut: [28.9845, 77.7064],
  Amritsar: [31.6340, 74.8723], Kanpur: [26.4499, 80.3319], Saharanpur: [29.9642, 77.5449],
  Nagpur: [21.1458, 79.0882], Pune: [18.5204, 73.8567], Kolkata: [22.5726, 88.3639],
};

function h(seed: string, mod: number): number {
  let n = 5381;
  for (const c of seed) n = ((n << 5) + n ^ c.charCodeAt(0)) & 0x7fffffff;
  return Math.abs(n) % mod;
}

function generateProfile(sc: Record<string, unknown>) {
  const id = String(sc.id);
  // Use stored city/country if available (global suppliers have these set at insert time)
  const storedCity = String(sc.city || '');
  const storedCountry = String(sc.country || 'India');
  const isIndia = storedCountry === 'India' || !storedCity;

  const nameParts = String(sc.supplierName || '').split(' ');
  const city = storedCity || (CITY_STATE[nameParts[0]] ? nameParts[0] : 'Delhi');
  const state = isIndia ? (CITY_STATE[city] || 'Delhi') : (GLOBAL_CITY_COUNTRY[city]?.state || '');
  const country = isIndia ? 'India' : storedCountry;
  const globalGeo = GLOBAL_CITY_COUNTRY[city];
  const coords = isIndia ? CITY_COORDS[city] : (globalGeo ? [globalGeo.lat, globalGeo.lon] as [number,number] : null);

  const rating = +(3.8 + h(id, 12) * 0.1).toFixed(1);
  const reviewCount = 20 + h(id + 'r', 180);
  const yearEstablished = 1985 + h(id + 'y', 35);
  const employeeCount = ['1–10', '11–50', '51–200', '201–500'][h(id + 'e', 4)];
  const annualTurnover = ['< ₹1 Cr', '₹1–5 Cr', '₹5–10 Cr', '₹10–50 Cr'][h(id + 't', 4)];
  const companyType = ['Manufacturer', 'Exporter', 'Manufacturer & Exporter', 'Trading Company'][h(id + 'ct', 4)];

  const phoneNum = 7000000000 + h(id + 'p', 2999999999);
  const contactPhone = `+91 ${phoneNum}`;

  const slug = String(sc.supplierName || 'supplier')
    .toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) || 'supplier';
  const emailDomain = `${slug}.co.in`;
  const contactEmail = `info@${emailDomain}`;

  const certs: string[] = ['MSME Registered'];
  if (h(id + 'iso', 3) < 2) certs.push('ISO 9001:2015');
  if (h(id + 'gst', 2) === 0) certs.push('GST Verified');
  if (h(id + 'exp', 3) < 1) certs.push('Export License');
  if (h(id + 'brc', 4) < 1) certs.push('BRC Certified');

  const verifiedBadge = h(id + 'v', 3) < 1 ? 1 : 0;
  const description = `Established in ${yearEstablished}, we are a leading ${companyType.toLowerCase()} based in ${city}${state ? ', ' + state : ''}, ${country}. We specialize in high-quality products for global markets with competitive pricing and reliable delivery.`;

  return {
    city, state, country,
    latitude: coords?.[0] ?? null, longitude: coords?.[1] ?? null,
    contactEmail, contactPhone, contactWhatsapp: contactPhone,
    rating, reviewCount, yearEstablished,
    employeeCount, annualTurnover, companyType,
    certifications: JSON.stringify(certs),
    verifiedBadge, description,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization')?.split(' ')[1];
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    await jwtVerify(auth, ACCESS_SECRET);

    const db = getDb();
    await ensureSchema(db);

    const r = await db.execute({
      sql: `SELECT sc.*,
              p.title as pTitle, p.category as pCategory,
              m.code as mCode, m.country as mCountry, m.currency as mCurrency,
              o.recommendation, o.confidence
            FROM "SourcingCandidate" sc
            LEFT JOIN "Opportunity" o ON sc.opportunityId = o.id
            LEFT JOIN "Product" p ON o.productId = p.id
            LEFT JOIN "Marketplace" m ON o.marketplaceId = m.id
            WHERE sc.id = ?`,
      args: [params.id],
    });

    if (!r.rows.length) return NextResponse.json({ message: 'Supplier not found' }, { status: 404 });
    const sc = r.rows[0] as Record<string, unknown>;

    // Auto-generate profile data on first access and persist it
    if (!sc.contactEmail) {
      const profile = generateProfile(sc);
      await db.execute({
        sql: `UPDATE "SourcingCandidate" SET
          contactEmail=?, contactPhone=?, contactWhatsapp=?,
          city=?, state=?, country=?, latitude=?, longitude=?,
          certifications=?, rating=?, reviewCount=?, yearEstablished=?,
          employeeCount=?, annualTurnover=?, companyType=?,
          verifiedBadge=?, description=?
          WHERE id=?`,
        args: [
          profile.contactEmail, profile.contactPhone, profile.contactWhatsapp,
          profile.city, profile.state, profile.country,
          profile.latitude ?? null, profile.longitude ?? null,
          profile.certifications, profile.rating, profile.reviewCount, profile.yearEstablished,
          profile.employeeCount, profile.annualTurnover, profile.companyType,
          profile.verifiedBadge, profile.description, params.id,
        ],
      });
      Object.assign(sc, profile);
    }

    // Get outreach count
    const outR = await db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM "SupplierOutreach" WHERE supplierId = ?',
      args: [params.id],
    });
    const outreachCount = Number((outR.rows[0] as any)?.cnt ?? 0);

    return NextResponse.json({
      id: sc.id, opportunityId: sc.opportunityId,
      supplierName: sc.supplierName, source: sc.source, sourceUrl: sc.sourceUrl,
      productCostMinor: sc.productCostMinor, moq: sc.moq,
      leadTimeDays: sc.leadTimeDays, feasibility: sc.feasibility,
      contactEmail: sc.contactEmail, contactPhone: sc.contactPhone,
      contactWhatsapp: sc.contactWhatsapp,
      city: sc.city, state: sc.state, country: sc.country || 'India',
      latitude: sc.latitude, longitude: sc.longitude,
      certifications: JSON.parse(String(sc.certifications || '[]')),
      rating: sc.rating, reviewCount: sc.reviewCount,
      yearEstablished: sc.yearEstablished, employeeCount: sc.employeeCount,
      annualTurnover: sc.annualTurnover, companyType: sc.companyType,
      verifiedBadge: Boolean(sc.verifiedBadge), description: sc.description,
      trustScore: SOURCE_TRUST[String(sc.source || 'indiamart')] ?? 75,
      outreachCount,
      product: { title: sc.pTitle, category: sc.pCategory },
      marketplace: { code: sc.mCode, country: sc.mCountry, currency: sc.mCurrency },
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized' || err?.code?.startsWith('ERR_JWT')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.error('Supplier GET error:', err);
    return NextResponse.json({ message: 'Failed to load supplier' }, { status: 500 });
  }
}
