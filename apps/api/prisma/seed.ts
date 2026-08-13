import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const OWNER = {
  name:     'BorderScout Owner',
  email:    'owner@borderscout.ai',
  password: 'BorderScout@2024',
  orgName:  'BorderScout AI',
};

// ── Global marketplace catalogue ──────────────────────────────────────────────
// feeSchedule: referralPct (%), fbaFeeMinor (fulfillment in minor units), storageFee (monthly minor units)

const MARKETPLACES = [
  // ── Amazon ───────────────────────────────────────────────────────────────
  { code: 'amazon_us', country: 'US', currency: 'USD', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 350,  storageFee: 50  } },
  { code: 'amazon_uk', country: 'GB', currency: 'GBP', active: true,
    feeSchedule: { referralPct: 15.3, fbaFeeMinor: 280,  storageFee: 45  } },
  { code: 'amazon_de', country: 'DE', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 290,  storageFee: 48  } },
  { code: 'amazon_ca', country: 'CA', currency: 'CAD', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 380,  storageFee: 55  } },
  { code: 'amazon_au', country: 'AU', currency: 'AUD', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 420,  storageFee: 60  } },
  { code: 'amazon_fr', country: 'FR', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 290,  storageFee: 48  } },
  { code: 'amazon_it', country: 'IT', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 290,  storageFee: 48  } },
  { code: 'amazon_es', country: 'ES', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 290,  storageFee: 48  } },
  { code: 'amazon_nl', country: 'NL', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 290,  storageFee: 48  } },
  { code: 'amazon_se', country: 'SE', currency: 'SEK', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 3000, storageFee: 500 } },
  { code: 'amazon_pl', country: 'PL', currency: 'PLN', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 1300, storageFee: 200 } },
  { code: 'amazon_tr', country: 'TR', currency: 'TRY', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 2500, storageFee: 400 } },
  { code: 'amazon_ae', country: 'AE', currency: 'AED', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 1300, storageFee: 200 } },
  { code: 'amazon_sa', country: 'SA', currency: 'SAR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 1300, storageFee: 200 } },
  { code: 'amazon_sg', country: 'SG', currency: 'SGD', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 500,  storageFee: 80  } },
  { code: 'amazon_in', country: 'IN', currency: 'INR', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 4500, storageFee: 800 } },
  { code: 'amazon_jp', country: 'JP', currency: 'JPY', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 50000,storageFee: 8000} },
  { code: 'amazon_mx', country: 'MX', currency: 'MXN', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 7000, storageFee: 1200} },
  { code: 'amazon_br', country: 'BR', currency: 'BRL', active: true,
    feeSchedule: { referralPct: 16,   fbaFeeMinor: 1800, storageFee: 300 } },

  // ── Etsy ─────────────────────────────────────────────────────────────────
  { code: 'etsy',      country: 'US', currency: 'USD', active: true,
    feeSchedule: { referralPct: 6.5,  fbaFeeMinor: 0,   storageFee: 0   } },

  // ── eBay ─────────────────────────────────────────────────────────────────
  { code: 'ebay_us',   country: 'US', currency: 'USD', active: true,
    feeSchedule: { referralPct: 13,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'ebay_uk',   country: 'GB', currency: 'GBP', active: true,
    feeSchedule: { referralPct: 12.8, fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'ebay_de',   country: 'DE', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 12.5, fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'ebay_au',   country: 'AU', currency: 'AUD', active: true,
    feeSchedule: { referralPct: 13.4, fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Walmart ───────────────────────────────────────────────────────────────
  { code: 'walmart',   country: 'US', currency: 'USD', active: true,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'walmart_ca',country: 'CA', currency: 'CAD', active: false,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Shopee ────────────────────────────────────────────────────────────────
  { code: 'shopee_sg', country: 'SG', currency: 'SGD', active: true,
    feeSchedule: { referralPct: 4,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_my', country: 'MY', currency: 'MYR', active: true,
    feeSchedule: { referralPct: 4,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_th', country: 'TH', currency: 'THB', active: true,
    feeSchedule: { referralPct: 4,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_ph', country: 'PH', currency: 'PHP', active: true,
    feeSchedule: { referralPct: 3,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_id', country: 'ID', currency: 'IDR', active: true,
    feeSchedule: { referralPct: 3,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_vn', country: 'VN', currency: 'VND', active: true,
    feeSchedule: { referralPct: 3,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_tw', country: 'TW', currency: 'TWD', active: true,
    feeSchedule: { referralPct: 3,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'shopee_br', country: 'BR', currency: 'BRL', active: false,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Lazada ────────────────────────────────────────────────────────────────
  { code: 'lazada_sg', country: 'SG', currency: 'SGD', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'lazada_my', country: 'MY', currency: 'MYR', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'lazada_th', country: 'TH', currency: 'THB', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'lazada_ph', country: 'PH', currency: 'PHP', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'lazada_id', country: 'ID', currency: 'IDR', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'lazada_vn', country: 'VN', currency: 'VND', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },

  // ── TikTok Shop ───────────────────────────────────────────────────────────
  { code: 'tiktok_us', country: 'US', currency: 'USD', active: true,
    feeSchedule: { referralPct: 6,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_uk', country: 'GB', currency: 'GBP', active: true,
    feeSchedule: { referralPct: 6,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_de', country: 'DE', currency: 'EUR', active: false,
    feeSchedule: { referralPct: 6,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_sg', country: 'SG', currency: 'SGD', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_my', country: 'MY', currency: 'MYR', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_th', country: 'TH', currency: 'THB', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_ph', country: 'PH', currency: 'PHP', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_id', country: 'ID', currency: 'IDR', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'tiktok_vn', country: 'VN', currency: 'VND', active: true,
    feeSchedule: { referralPct: 5,    fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Noon (Middle East) ────────────────────────────────────────────────────
  { code: 'noon_ae',   country: 'AE', currency: 'AED', active: true,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'noon_sa',   country: 'SA', currency: 'SAR', active: true,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'noon_eg',   country: 'EG', currency: 'EGP', active: false,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Temu ─────────────────────────────────────────────────────────────────
  { code: 'temu_us',   country: 'US', currency: 'USD', active: true,
    feeSchedule: { referralPct: 0,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'temu_uk',   country: 'GB', currency: 'GBP', active: false,
    feeSchedule: { referralPct: 0,    fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'temu_de',   country: 'DE', currency: 'EUR', active: false,
    feeSchedule: { referralPct: 0,    fbaFeeMinor: 0,   storageFee: 0   } },

  // ── MercadoLibre (Latin America) ──────────────────────────────────────────
  { code: 'mercadolibre_br', country: 'BR', currency: 'BRL', active: true,
    feeSchedule: { referralPct: 16,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'mercadolibre_mx', country: 'MX', currency: 'MXN', active: true,
    feeSchedule: { referralPct: 16,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'mercadolibre_ar', country: 'AR', currency: 'ARS', active: false,
    feeSchedule: { referralPct: 16,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'mercadolibre_co', country: 'CO', currency: 'COP', active: false,
    feeSchedule: { referralPct: 16,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'mercadolibre_cl', country: 'CL', currency: 'CLP', active: false,
    feeSchedule: { referralPct: 16,   fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Coupang (South Korea) ─────────────────────────────────────────────────
  { code: 'coupang_kr', country: 'KR', currency: 'KRW', active: true,
    feeSchedule: { referralPct: 10.8, fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Rakuten (Japan) ───────────────────────────────────────────────────────
  { code: 'rakuten_jp', country: 'JP', currency: 'JPY', active: true,
    feeSchedule: { referralPct: 10,   fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Flipkart (India) ──────────────────────────────────────────────────────
  { code: 'flipkart_in', country: 'IN', currency: 'INR', active: true,
    feeSchedule: { referralPct: 14,   fbaFeeMinor: 4000, storageFee: 700} },

  // ── Meesho (India) ────────────────────────────────────────────────────────
  { code: 'meesho_in', country: 'IN', currency: 'INR', active: true,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },

  // ── European Specialists ──────────────────────────────────────────────────
  { code: 'allegro_pl',  country: 'PL', currency: 'PLN', active: true,
    feeSchedule: { referralPct: 10,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'bol_nl',      country: 'NL', currency: 'EUR', active: true,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'zalando_eu',  country: 'DE', currency: 'EUR', active: false,
    feeSchedule: { referralPct: 25,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'otto_de',     country: 'DE', currency: 'EUR', active: false,
    feeSchedule: { referralPct: 15,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'cdiscount_fr',country: 'FR', currency: 'EUR', active: false,
    feeSchedule: { referralPct: 13,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'onbuy_uk',    country: 'GB', currency: 'GBP', active: false,
    feeSchedule: { referralPct: 9,    fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Africa ────────────────────────────────────────────────────────────────
  { code: 'jumia_ng',    country: 'NG', currency: 'NGN', active: true,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'jumia_ke',    country: 'KE', currency: 'KES', active: false,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'takealot_za', country: 'ZA', currency: 'ZAR', active: true,
    feeSchedule: { referralPct: 12,   fbaFeeMinor: 0,   storageFee: 0   } },

  // ── Daraz (South Asia) ────────────────────────────────────────────────────
  { code: 'daraz_pk',   country: 'PK', currency: 'PKR', active: false,
    feeSchedule: { referralPct: 10,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'daraz_lk',   country: 'LK', currency: 'LKR', active: false,
    feeSchedule: { referralPct: 10,   fbaFeeMinor: 0,   storageFee: 0   } },
  { code: 'daraz_bd',   country: 'BD', currency: 'BDT', active: false,
    feeSchedule: { referralPct: 10,   fbaFeeMinor: 0,   storageFee: 0   } },
];

async function main() {
  // ── Seed owner account ────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email: OWNER.email } });
  if (!existing) {
    let org = await prisma.organization.findFirst({ where: { name: OWNER.orgName } });
    if (!org) org = await prisma.organization.create({ data: { name: OWNER.orgName, plan: 'starter' } });
    const sub = await prisma.subscription.findUnique({ where: { organizationId: org.id } });
    if (!sub) await prisma.subscription.create({ data: { organizationId: org.id, plan: 'starter', status: 'active' } });
    const passwordHash = await argon2.hash(OWNER.password);
    await prisma.user.create({
      data: { organizationId: org.id, email: OWNER.email, passwordHash, name: OWNER.name, role: 'owner' },
    });
    console.log('Seeded owner account:', OWNER.email);
  } else {
    console.log('Owner account already exists, skipping.');
  }

  // ── Seed marketplaces ─────────────────────────────────────────────────────
  let created = 0;
  for (const mp of MARKETPLACES) {
    await prisma.marketplace.upsert({
      where:  { code: mp.code },
      update: { active: mp.active, feeSchedule: JSON.stringify(mp.feeSchedule) },
      create: {
        code:        mp.code,
        country:     mp.country,
        currency:    mp.currency,
        feeSchedule: JSON.stringify(mp.feeSchedule),
        active:      mp.active,
      },
    });
    created++;
  }
  console.log(`Seeded ${created} marketplaces.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
