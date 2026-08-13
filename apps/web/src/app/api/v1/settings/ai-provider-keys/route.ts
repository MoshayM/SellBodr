import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'
);

// env var name for each provider id
const PROVIDER_ENV: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai:    'OPENAI_API_KEY',
  xai:       'XAI_API_KEY',
  gemini:    'GEMINI_API_KEY',
  mistral:   'MISTRAL_API_KEY',
  cohere:    'COHERE_API_KEY',
  groq:      'GROQ_API_KEY',
};

const PROVIDER_META: Record<string, { label: string; hint: string }> = {
  anthropic: { label: 'Anthropic',  hint: 'Claude models' },
  openai:    { label: 'OpenAI',     hint: 'GPT-4o, o1 & more' },
  xai:       { label: 'xAI (Grok)', hint: 'Grok-2, Grok-3' },
  gemini:    { label: 'Gemini',     hint: 'Gemini 1.5 & 2.0' },
  mistral:   { label: 'Mistral',    hint: 'Mistral Large, Codestral' },
  cohere:    { label: 'Cohere',     hint: 'Command R+' },
  groq:      { label: 'Groq',       hint: 'Llama 3, Mixtral (fast inference)' },
};

function mask(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

async function ensureTable(db: ReturnType<typeof getDb>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "ProviderKey" (
      id         TEXT PRIMARY KEY,
      provider   TEXT UNIQUE NOT NULL,
      keyValue   TEXT NOT NULL,
      maskedKey  TEXT NOT NULL,
      createdAt  TEXT NOT NULL,
      updatedAt  TEXT NOT NULL
    )
  `);
}

async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!auth) return null;
  try {
    const { payload } = await jwtVerify(auth, ACCESS_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await ensureTable(db);

  const dbResult = await db.execute('SELECT provider, keyValue, maskedKey FROM "ProviderKey"');
  const dbKeys: Record<string, { keyValue: string; maskedKey: string }> = {};
  for (const row of dbResult.rows) {
    dbKeys[String(row.provider)] = { keyValue: String(row.keyValue), maskedKey: String(row.maskedKey) };
  }

  const statuses = Object.keys(PROVIDER_META).map(id => {
    const envVar = PROVIDER_ENV[id];
    const envVal = process.env[envVar]?.replace(/^﻿/, '').trim();
    const dbRow  = dbKeys[id];
    const meta   = PROVIDER_META[id];

    if (dbRow) {
      return { id, ...meta, isSet: true, masked: dbRow.maskedKey, source: 'db' as const };
    }
    if (envVal) {
      return { id, ...meta, isSet: true, masked: mask(envVal), source: 'env' as const };
    }
    return { id, ...meta, isSet: false, masked: null, source: 'none' as const };
  });

  return NextResponse.json(statuses);
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await ensureTable(db);

  const body: Record<string, string> = await req.json();
  const now = new Date().toISOString();

  for (const [provider, keyValue] of Object.entries(body)) {
    if (!PROVIDER_META[provider]) continue;
    const trimmed = keyValue.trim();

    if (trimmed === '') {
      // Empty string = delete the DB override (fall back to env)
      await db.execute({ sql: 'DELETE FROM "ProviderKey" WHERE provider = ?', args: [provider] });
    } else {
      const maskedKey = mask(trimmed);
      const existing  = await db.execute({ sql: 'SELECT id FROM "ProviderKey" WHERE provider = ?', args: [provider] });
      if (existing.rows.length > 0) {
        await db.execute({
          sql:  'UPDATE "ProviderKey" SET keyValue=?, maskedKey=?, updatedAt=? WHERE provider=?',
          args: [trimmed, maskedKey, now, provider],
        });
      } else {
        await db.execute({
          sql:  'INSERT INTO "ProviderKey" (id,provider,keyValue,maskedKey,createdAt,updatedAt) VALUES (?,?,?,?,?,?)',
          args: [uuidv4(), provider, trimmed, maskedKey, now, now],
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
