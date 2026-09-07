import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.PROVIDER_KEY_SECRET || 'dev-provider-key-secret-change-me';
  if (process.env.NODE_ENV === 'production' && !process.env.PROVIDER_KEY_SECRET) {
    console.error('FATAL: PROVIDER_KEY_SECRET is not set — API keys stored without encryption');
  }
  return scryptSync(secret, 'sellbodr-provider-key-salt-v1', 32);
}

export function encryptKey(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptKey(ciphertext: string): string {
  // Unencrypted legacy value (no enc: prefix) — return as-is
  if (!ciphertext.startsWith('enc:')) return ciphertext;
  const [, ivHex, tagHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format');
  const key     = getKey();
  const iv      = Buffer.from(ivHex, 'hex');
  const tag     = Buffer.from(tagHex, 'hex');
  const data    = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}
