import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL?.replace(/^﻿/, '').trim();
    const authToken = process.env.TURSO_AUTH_TOKEN?.replace(/^﻿/, '').trim();
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    client = createClient({ url, authToken });
  }
  return client;
}
