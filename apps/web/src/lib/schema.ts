import type { Client } from '@libsql/client';

let schemaReady = false;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS "Organization" (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Subscription" (
    id TEXT PRIMARY KEY, organizationId TEXT, plan TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active', createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY, organizationId TEXT, email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL, name TEXT, role TEXT DEFAULT 'member',
    lastLoginAt INTEGER, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, tokenHash TEXT NOT NULL,
    expiresAt INTEGER NOT NULL, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    id TEXT PRIMARY KEY, userId TEXT, action TEXT NOT NULL,
    resource TEXT, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Marketplace" (
    id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, country TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'USD', feeSchedule TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Product" (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT DEFAULT '',
    imageUrl TEXT DEFAULT '', description TEXT DEFAULT '',
    createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Opportunity" (
    id TEXT PRIMARY KEY, productId TEXT NOT NULL, marketplaceId TEXT NOT NULL,
    status TEXT DEFAULT 'active', recommendation TEXT DEFAULT 'hold',
    confidence REAL DEFAULT 50, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Score" (
    id TEXT PRIMARY KEY, opportunityId TEXT UNIQUE NOT NULL,
    opportunity REAL DEFAULT 0, demand REAL DEFAULT 0, competition REAL DEFAULT 0,
    margin REAL DEFAULT 0, trend REAL DEFAULT 0, shipping REAL DEFAULT 0,
    marketplaceFit REAL DEFAULT 0, saturation REAL DEFAULT 0,
    scoreVersion TEXT DEFAULT '2.0.0', createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "ProfitModel" (
    id TEXT PRIMARY KEY, opportunityId TEXT UNIQUE NOT NULL,
    sourcePriceMinor INTEGER DEFAULT 0, salePriceMinor INTEGER DEFAULT 0,
    landedCostMinor INTEGER DEFAULT 0, marketplaceFeeMinor INTEGER DEFAULT 0,
    netProfitMinor INTEGER DEFAULT 0, netMarginPct REAL DEFAULT 0,
    roi REAL DEFAULT 0, currency TEXT DEFAULT 'USD',
    createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "SourcingCandidate" (
    id TEXT PRIMARY KEY, opportunityId TEXT NOT NULL,
    supplierName TEXT, source TEXT DEFAULT 'indiamart', sourceUrl TEXT,
    productCostMinor INTEGER DEFAULT 0, moq INTEGER DEFAULT 1,
    leadTimeDays INTEGER DEFAULT 30, feasibility TEXT DEFAULT 'moderate',
    createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Search" (
    id TEXT PRIMARY KEY, marketplace TEXT NOT NULL,
    status TEXT DEFAULT 'running', opportunityCount INTEGER DEFAULT 0,
    errorMessage TEXT, createdAt INTEGER NOT NULL DEFAULT 0,
    completedAt INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "ProviderKey" (
    id TEXT PRIMARY KEY, provider TEXT UNIQUE NOT NULL, encryptedKey TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
];

export async function ensureSchema(db: Client): Promise<void> {
  if (schemaReady) return;

  // Run each CREATE TABLE individually — compatible with Turso HTTP + WebSocket clients
  for (const sql of TABLES) {
    await db.execute(sql);
  }

  // Seed marketplaces if empty
  const r = await db.execute('SELECT COUNT(*) as c FROM "Marketplace"');
  const count = Number((r.rows[0] as any)?.c ?? 0);
  if (count === 0) await seedMarketplaces(db);

  schemaReady = true;
}

// ── Marketplace seed data ─────────────────────────────────────────
const MARKETPLACES = [
  // Amazon
  { code: 'amazon_us', country: 'us', currency: 'USD', ref: 15, fba: 300 },
  { code: 'amazon_uk', country: 'gb', currency: 'GBP', ref: 15, fba: 250 },
  { code: 'amazon_de', country: 'de', currency: 'EUR', ref: 15, fba: 270 },
  { code: 'amazon_ca', country: 'ca', currency: 'CAD', ref: 15, fba: 350 },
  { code: 'amazon_au', country: 'au', currency: 'AUD', ref: 15, fba: 400 },
  { code: 'amazon_fr', country: 'fr', currency: 'EUR', ref: 15, fba: 270 },
  { code: 'amazon_it', country: 'it', currency: 'EUR', ref: 15, fba: 270 },
  { code: 'amazon_es', country: 'es', currency: 'EUR', ref: 15, fba: 270 },
  { code: 'amazon_nl', country: 'nl', currency: 'EUR', ref: 15, fba: 270 },
  { code: 'amazon_se', country: 'se', currency: 'SEK', ref: 15, fba: 3500 },
  { code: 'amazon_pl', country: 'pl', currency: 'PLN', ref: 15, fba: 1200 },
  { code: 'amazon_tr', country: 'tr', currency: 'TRY', ref: 15, fba: 6500 },
  { code: 'amazon_ae', country: 'ae', currency: 'AED', ref: 15, fba: 1100 },
  { code: 'amazon_sa', country: 'sa', currency: 'SAR', ref: 15, fba: 1100 },
  { code: 'amazon_sg', country: 'sg', currency: 'SGD', ref: 15, fba: 400  },
  { code: 'amazon_in', country: 'in', currency: 'INR', ref: 15, fba: 2500 },
  { code: 'amazon_jp', country: 'jp', currency: 'JPY', ref: 15, fba: 40000 },
  { code: 'amazon_mx', country: 'mx', currency: 'MXN', ref: 15, fba: 6000 },
  { code: 'amazon_br', country: 'br', currency: 'BRL', ref: 16, fba: 2000 },
  // eBay
  { code: 'ebay_us',   country: 'us', currency: 'USD', ref: 12, fba: 0 },
  { code: 'ebay_uk',   country: 'gb', currency: 'GBP', ref: 12, fba: 0 },
  { code: 'ebay_de',   country: 'de', currency: 'EUR', ref: 12, fba: 0 },
  { code: 'ebay_au',   country: 'au', currency: 'AUD', ref: 12, fba: 0 },
  // Other major
  { code: 'etsy',       country: 'us', currency: 'USD', ref: 7,  fba: 20 },
  { code: 'walmart',    country: 'us', currency: 'USD', ref: 15, fba: 0  },
  { code: 'walmart_ca', country: 'ca', currency: 'CAD', ref: 15, fba: 0  },
  // Shopee
  { code: 'shopee_sg', country: 'sg', currency: 'SGD', ref: 8, fba: 0 },
  { code: 'shopee_my', country: 'my', currency: 'MYR', ref: 8, fba: 0 },
  { code: 'shopee_th', country: 'th', currency: 'THB', ref: 8, fba: 0 },
  { code: 'shopee_ph', country: 'ph', currency: 'PHP', ref: 8, fba: 0 },
  { code: 'shopee_id', country: 'id', currency: 'IDR', ref: 8, fba: 0 },
  { code: 'shopee_vn', country: 'vn', currency: 'VND', ref: 8, fba: 0 },
  { code: 'shopee_tw', country: 'tw', currency: 'TWD', ref: 8, fba: 0 },
  { code: 'shopee_br', country: 'br', currency: 'BRL', ref: 10, fba: 0 },
  // Lazada
  { code: 'lazada_sg', country: 'sg', currency: 'SGD', ref: 5, fba: 0 },
  { code: 'lazada_my', country: 'my', currency: 'MYR', ref: 5, fba: 0 },
  { code: 'lazada_th', country: 'th', currency: 'THB', ref: 5, fba: 0 },
  { code: 'lazada_ph', country: 'ph', currency: 'PHP', ref: 5, fba: 0 },
  { code: 'lazada_id', country: 'id', currency: 'IDR', ref: 5, fba: 0 },
  { code: 'lazada_vn', country: 'vn', currency: 'VND', ref: 5, fba: 0 },
  // TikTok Shop
  { code: 'tiktok_us', country: 'us', currency: 'USD', ref: 8, fba: 0 },
  { code: 'tiktok_uk', country: 'gb', currency: 'GBP', ref: 8, fba: 0 },
  { code: 'tiktok_de', country: 'de', currency: 'EUR', ref: 8, fba: 0 },
  { code: 'tiktok_sg', country: 'sg', currency: 'SGD', ref: 8, fba: 0 },
  { code: 'tiktok_my', country: 'my', currency: 'MYR', ref: 8, fba: 0 },
  { code: 'tiktok_th', country: 'th', currency: 'THB', ref: 8, fba: 0 },
  { code: 'tiktok_ph', country: 'ph', currency: 'PHP', ref: 8, fba: 0 },
  { code: 'tiktok_id', country: 'id', currency: 'IDR', ref: 8, fba: 0 },
  { code: 'tiktok_vn', country: 'vn', currency: 'VND', ref: 8, fba: 0 },
  // Noon
  { code: 'noon_ae', country: 'ae', currency: 'AED', ref: 10, fba: 0 },
  { code: 'noon_sa', country: 'sa', currency: 'SAR', ref: 10, fba: 0 },
  { code: 'noon_eg', country: 'eg', currency: 'EGP', ref: 10, fba: 0 },
  // Temu
  { code: 'temu_us', country: 'us', currency: 'USD', ref: 10, fba: 0 },
  { code: 'temu_uk', country: 'gb', currency: 'GBP', ref: 10, fba: 0 },
  { code: 'temu_de', country: 'de', currency: 'EUR', ref: 10, fba: 0 },
  // MercadoLibre
  { code: 'mercadolibre_br', country: 'br', currency: 'BRL', ref: 16, fba: 0 },
  { code: 'mercadolibre_mx', country: 'mx', currency: 'MXN', ref: 16, fba: 0 },
  { code: 'mercadolibre_ar', country: 'ar', currency: 'ARS', ref: 16, fba: 0 },
  { code: 'mercadolibre_co', country: 'co', currency: 'COP', ref: 16, fba: 0 },
  { code: 'mercadolibre_cl', country: 'cl', currency: 'CLP', ref: 16, fba: 0 },
  // India
  { code: 'flipkart_in', country: 'in', currency: 'INR', ref: 10, fba: 0 },
  { code: 'meesho_in',   country: 'in', currency: 'INR', ref: 5,  fba: 0 },
  // East Asia
  { code: 'coupang_kr',  country: 'kr', currency: 'KRW', ref: 11, fba: 0 },
  { code: 'rakuten_jp',  country: 'jp', currency: 'JPY', ref: 8,  fba: 0 },
  // Europe
  { code: 'allegro_pl',   country: 'pl', currency: 'PLN', ref: 9,  fba: 0 },
  { code: 'bol_nl',       country: 'nl', currency: 'EUR', ref: 13, fba: 0 },
  { code: 'zalando_eu',   country: 'eu', currency: 'EUR', ref: 25, fba: 0 },
  { code: 'otto_de',      country: 'de', currency: 'EUR', ref: 12, fba: 0 },
  { code: 'cdiscount_fr', country: 'fr', currency: 'EUR', ref: 14, fba: 0 },
  { code: 'onbuy_uk',     country: 'gb', currency: 'GBP', ref: 9,  fba: 0 },
  // Africa
  { code: 'jumia_ng',    country: 'ng', currency: 'NGN', ref: 12, fba: 0 },
  { code: 'jumia_ke',    country: 'ke', currency: 'KES', ref: 12, fba: 0 },
  { code: 'takealot_za', country: 'za', currency: 'ZAR', ref: 15, fba: 0 },
  // South Asia
  { code: 'daraz_pk', country: 'pk', currency: 'PKR', ref: 10, fba: 0 },
  { code: 'daraz_lk', country: 'lk', currency: 'LKR', ref: 10, fba: 0 },
  { code: 'daraz_bd', country: 'bd', currency: 'BDT', ref: 10, fba: 0 },
];

async function seedMarketplaces(db: Client): Promise<void> {
  const now = Date.now();
  for (const mp of MARKETPLACES) {
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO "Marketplace" (id, code, country, currency, feeSchedule, active, createdAt)
              VALUES (?, ?, ?, ?, ?, 1, ?)`,
        args: [
          crypto.randomUUID(), mp.code, mp.country, mp.currency,
          JSON.stringify({ referralPct: mp.ref, fbaFeeMinor: mp.fba }),
          now,
        ],
      });
    } catch { /* ignore duplicate */ }
  }
}
