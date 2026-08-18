import type { Client } from '@libsql/client';

let schemaReady = false;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS "Organization" (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, plan TEXT DEFAULT 'starter',
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Subscription" (
    id TEXT PRIMARY KEY, organizationId TEXT, plan TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active', createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY, organizationId TEXT, email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL, name TEXT, role TEXT DEFAULT 'member',
    plan TEXT DEFAULT 'free',
    mfaEnabled INTEGER DEFAULT 0, lastLoginAt INTEGER, deletedAt INTEGER,
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, tokenHash TEXT NOT NULL,
    expiresAt INTEGER NOT NULL, revoked INTEGER DEFAULT 0, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    id TEXT PRIMARY KEY, organizationId TEXT, actorUserId TEXT, userId TEXT,
    action TEXT NOT NULL, resourceType TEXT, resourceId TEXT, resource TEXT,
    createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Marketplace" (
    id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, country TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'USD', feeSchedule TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Product" (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT DEFAULT '',
    imageUrl TEXT DEFAULT '', description TEXT DEFAULT '',
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
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
    supplierId TEXT DEFAULT '',
    supplierName TEXT, source TEXT DEFAULT 'indiamart', sourceUrl TEXT,
    productCostMinor INTEGER DEFAULT 0, moq INTEGER DEFAULT 1,
    leadTimeDays INTEGER DEFAULT 30, feasibility TEXT DEFAULT 'moderate',
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Search" (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL DEFAULT '',
    filters TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'queued', startedAt INTEGER DEFAULT 0,
    completedAt INTEGER DEFAULT 0, createdAt INTEGER NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL DEFAULT 0,
    errorMessage TEXT, opportunityCount INTEGER DEFAULT 0, marketplace TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "ProviderKey" (
    id TEXT PRIMARY KEY, provider TEXT UNIQUE NOT NULL, encryptedKey TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "ListingAsset" (
    id TEXT PRIMARY KEY, opportunityId TEXT UNIQUE NOT NULL,
    seoTitle TEXT DEFAULT '', bullets TEXT DEFAULT '[]',
    description TEXT DEFAULT '', keywords TEXT DEFAULT '{}',
    positioning TEXT DEFAULT '', createdAt INTEGER NOT NULL DEFAULT 0,
    updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "Passkey" (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL,
    credentialId TEXT UNIQUE NOT NULL, publicKey TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0, deviceType TEXT DEFAULT 'singleDevice',
    backedUp INTEGER DEFAULT 0, transports TEXT DEFAULT '[]',
    name TEXT DEFAULT 'Passkey',
    createdAt INTEGER NOT NULL DEFAULT 0, lastUsedAt INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS "WebAuthnChallenge" (
    id TEXT PRIMARY KEY, challenge TEXT UNIQUE NOT NULL,
    userId TEXT, email TEXT, name TEXT, type TEXT NOT NULL,
    expiresAt INTEGER NOT NULL, createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "SupplierOutreach" (
    id TEXT PRIMARY KEY, supplierId TEXT NOT NULL, userId TEXT NOT NULL,
    opportunityId TEXT, channel TEXT NOT NULL,
    subject TEXT, messageBody TEXT,
    status TEXT DEFAULT 'sent',
    createdAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "AdCampaignDraft" (
    id TEXT PRIMARY KEY, opportunityId TEXT NOT NULL,
    content TEXT DEFAULT '{}',
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS "GrowthPlaybook" (
    id TEXT PRIMARY KEY, opportunityId TEXT UNIQUE NOT NULL,
    content TEXT DEFAULT '{}',
    createdAt INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL DEFAULT 0
  )`,
];

// Columns added to existing tables — SQLite has no ALTER TABLE ADD COLUMN IF NOT EXISTS,
// so we run each individually and swallow the "duplicate column" error on re-runs.
const MIGRATIONS = [
  `ALTER TABLE "Organization" ADD COLUMN plan TEXT DEFAULT 'starter'`,
  `ALTER TABLE "Organization" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Subscription" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN mfaEnabled INTEGER DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN deletedAt INTEGER`,
  `ALTER TABLE "RefreshToken" ADD COLUMN revoked INTEGER DEFAULT 0`,
  `ALTER TABLE "AuditLog" ADD COLUMN organizationId TEXT`,
  `ALTER TABLE "AuditLog" ADD COLUMN actorUserId TEXT`,
  `ALTER TABLE "AuditLog" ADD COLUMN resourceType TEXT`,
  `ALTER TABLE "AuditLog" ADD COLUMN resourceId TEXT`,
  `ALTER TABLE "Search" ADD COLUMN marketplace TEXT`,
  `ALTER TABLE "Search" ADD COLUMN errorMessage TEXT`,
  `ALTER TABLE "Search" ADD COLUMN completedAt INTEGER DEFAULT 0`,
  `ALTER TABLE "Search" ADD COLUMN opportunityCount INTEGER DEFAULT 0`,
  `ALTER TABLE "Product" ADD COLUMN imageUrl TEXT DEFAULT ''`,
  `ALTER TABLE "Product" ADD COLUMN description TEXT DEFAULT ''`,
  `ALTER TABLE "Product" ADD COLUMN category TEXT DEFAULT ''`,
  `ALTER TABLE "ProviderKey" ADD COLUMN keyValue TEXT DEFAULT ''`,
  `ALTER TABLE "ProviderKey" ADD COLUMN maskedKey TEXT DEFAULT ''`,
  `ALTER TABLE "Product" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Search" ADD COLUMN userId TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Search" ADD COLUMN filters TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE "Search" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Search" ADD COLUMN startedAt INTEGER DEFAULT 0`,
  // SourcingCandidate — columns added after initial table creation
  `ALTER TABLE "SourcingCandidate" ADD COLUMN supplierId TEXT DEFAULT ''`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN supplierName TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN source TEXT DEFAULT 'indiamart'`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN sourceUrl TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  // ProfitModel — column renames (new names added alongside old ones)
  `ALTER TABLE "ProfitModel" ADD COLUMN productCostMinor INTEGER DEFAULT 0`,
  `ALTER TABLE "ProfitModel" ADD COLUMN marketplaceFeesMinor INTEGER DEFAULT 0`,
  `ALTER TABLE "ProfitModel" ADD COLUMN roiPct REAL DEFAULT 0`,
  `ALTER TABLE "ProfitModel" ADD COLUMN landedCostMinor INTEGER DEFAULT 0`,
  `ALTER TABLE "ProfitModel" ADD COLUMN grossProfitMinor INTEGER DEFAULT 0`,
  `ALTER TABLE "ProfitModel" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  // Opportunity — searchId and updatedAt required by search pipeline
  `ALTER TABLE "Opportunity" ADD COLUMN searchId TEXT`,
  `ALTER TABLE "Opportunity" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  // Score — updatedAt required by search pipeline
  `ALTER TABLE "Score" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Score" ADD COLUMN marketplaceFit REAL DEFAULT 0`,
  // Marketplace — updatedAt column
  `ALTER TABLE "Marketplace" ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`,
  // SourcingCandidate — supplier contact + profile fields
  `ALTER TABLE "SourcingCandidate" ADD COLUMN contactEmail TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN contactPhone TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN contactWhatsapp TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN address TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN city TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN state TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN country TEXT DEFAULT 'India'`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN latitude REAL`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN longitude REAL`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN certifications TEXT DEFAULT '[]'`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN rating REAL`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN reviewCount INTEGER DEFAULT 0`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN companyType TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN yearEstablished INTEGER`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN employeeCount TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN annualTurnover TEXT`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN verifiedBadge INTEGER DEFAULT 0`,
  `ALTER TABLE "SourcingCandidate" ADD COLUMN description TEXT`,
  `ALTER TABLE "User" ADD COLUMN plan TEXT DEFAULT 'free'`,
  // Custom PIN fast-login (4-digit, bcrypt-hashed)
  `ALTER TABLE "User" ADD COLUMN pinHash TEXT`,
  `ALTER TABLE "User" ADD COLUMN pinAttempts INTEGER DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN pinLockedUntil INTEGER`,
];

export async function ensureSchema(db: Client): Promise<void> {
  if (schemaReady) return;

  // Batch all CREATE TABLE statements — 1 HTTP call instead of 13
  await db.batch(TABLES.map(sql => ({ sql, args: [] })), 'write');

  // Migrations: ADD COLUMN for columns missing from existing tables.
  // Must run individually — a failed batch aborts all; duplicate column errors are expected on re-runs.
  for (const sql of MIGRATIONS) {
    try { await db.execute(sql); } catch { /* column already exists — normal on re-runs */ }
  }

  // Seed marketplaces — batch all INSERT OR IGNORE in 1 HTTP call
  const r = await db.execute('SELECT COUNT(*) as c FROM "Marketplace"');
  const count = Number((r.rows[0] as any)?.c ?? 0);
  if (count < MARKETPLACES.length) {
    const now = Date.now();
    await db.batch(
      MARKETPLACES.map(mp => ({
        sql: `INSERT OR IGNORE INTO "Marketplace" (id, code, country, currency, feeSchedule, active, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [crypto.randomUUID(), mp.code, mp.country, mp.currency,
               JSON.stringify({ referralPct: mp.ref, fbaFeeMinor: mp.fba }), now, now],
      })),
      'write'
    );
  }

  schemaReady = true;
}

const MARKETPLACES = [
  // Amazon (19)
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
  // eBay (4)
  { code: 'ebay_us', country: 'us', currency: 'USD', ref: 12, fba: 0 },
  { code: 'ebay_uk', country: 'gb', currency: 'GBP', ref: 12, fba: 0 },
  { code: 'ebay_de', country: 'de', currency: 'EUR', ref: 12, fba: 0 },
  { code: 'ebay_au', country: 'au', currency: 'AUD', ref: 12, fba: 0 },
  // Other major
  { code: 'etsy',       country: 'us', currency: 'USD', ref: 7,  fba: 20 },
  { code: 'walmart',    country: 'us', currency: 'USD', ref: 15, fba: 0  },
  { code: 'walmart_ca', country: 'ca', currency: 'CAD', ref: 15, fba: 0  },
  // Shopee (8)
  { code: 'shopee_sg', country: 'sg', currency: 'SGD', ref: 8, fba: 0 },
  { code: 'shopee_my', country: 'my', currency: 'MYR', ref: 8, fba: 0 },
  { code: 'shopee_th', country: 'th', currency: 'THB', ref: 8, fba: 0 },
  { code: 'shopee_ph', country: 'ph', currency: 'PHP', ref: 8, fba: 0 },
  { code: 'shopee_id', country: 'id', currency: 'IDR', ref: 8, fba: 0 },
  { code: 'shopee_vn', country: 'vn', currency: 'VND', ref: 8, fba: 0 },
  { code: 'shopee_tw', country: 'tw', currency: 'TWD', ref: 8, fba: 0 },
  { code: 'shopee_br', country: 'br', currency: 'BRL', ref: 10, fba: 0 },
  // Lazada (6)
  { code: 'lazada_sg', country: 'sg', currency: 'SGD', ref: 5, fba: 0 },
  { code: 'lazada_my', country: 'my', currency: 'MYR', ref: 5, fba: 0 },
  { code: 'lazada_th', country: 'th', currency: 'THB', ref: 5, fba: 0 },
  { code: 'lazada_ph', country: 'ph', currency: 'PHP', ref: 5, fba: 0 },
  { code: 'lazada_id', country: 'id', currency: 'IDR', ref: 5, fba: 0 },
  { code: 'lazada_vn', country: 'vn', currency: 'VND', ref: 5, fba: 0 },
  // TikTok Shop (9)
  { code: 'tiktok_us', country: 'us', currency: 'USD', ref: 8, fba: 0 },
  { code: 'tiktok_uk', country: 'gb', currency: 'GBP', ref: 8, fba: 0 },
  { code: 'tiktok_de', country: 'de', currency: 'EUR', ref: 8, fba: 0 },
  { code: 'tiktok_sg', country: 'sg', currency: 'SGD', ref: 8, fba: 0 },
  { code: 'tiktok_my', country: 'my', currency: 'MYR', ref: 8, fba: 0 },
  { code: 'tiktok_th', country: 'th', currency: 'THB', ref: 8, fba: 0 },
  { code: 'tiktok_ph', country: 'ph', currency: 'PHP', ref: 8, fba: 0 },
  { code: 'tiktok_id', country: 'id', currency: 'IDR', ref: 8, fba: 0 },
  { code: 'tiktok_vn', country: 'vn', currency: 'VND', ref: 8, fba: 0 },
  // Noon (3)
  { code: 'noon_ae', country: 'ae', currency: 'AED', ref: 10, fba: 0 },
  { code: 'noon_sa', country: 'sa', currency: 'SAR', ref: 10, fba: 0 },
  { code: 'noon_eg', country: 'eg', currency: 'EGP', ref: 10, fba: 0 },
  // Temu (3)
  { code: 'temu_us', country: 'us', currency: 'USD', ref: 10, fba: 0 },
  { code: 'temu_uk', country: 'gb', currency: 'GBP', ref: 10, fba: 0 },
  { code: 'temu_de', country: 'de', currency: 'EUR', ref: 10, fba: 0 },
  // MercadoLibre (5)
  { code: 'mercadolibre_br', country: 'br', currency: 'BRL', ref: 16, fba: 0 },
  { code: 'mercadolibre_mx', country: 'mx', currency: 'MXN', ref: 16, fba: 0 },
  { code: 'mercadolibre_ar', country: 'ar', currency: 'ARS', ref: 16, fba: 0 },
  { code: 'mercadolibre_co', country: 'co', currency: 'COP', ref: 16, fba: 0 },
  { code: 'mercadolibre_cl', country: 'cl', currency: 'CLP', ref: 16, fba: 0 },
  // India
  { code: 'flipkart_in', country: 'in', currency: 'INR', ref: 10, fba: 0 },
  { code: 'meesho_in',   country: 'in', currency: 'INR', ref: 5,  fba: 0 },
  // East Asia
  { code: 'coupang_kr', country: 'kr', currency: 'KRW', ref: 11, fba: 0 },
  { code: 'rakuten_jp', country: 'jp', currency: 'JPY', ref: 8,  fba: 0 },
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
