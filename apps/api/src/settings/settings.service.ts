import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../common/prisma.service';

const KEY_PREFIX_LEN = 8;

export const AI_PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic',      hint: 'Claude models',        envKey: 'ANTHROPIC_API_KEY',  prefix: 'sk-ant-' },
  { id: 'openai',    label: 'OpenAI',          hint: 'GPT-4o, o1, etc.',     envKey: 'OPENAI_API_KEY',     prefix: 'sk-'     },
  { id: 'xai',       label: 'xAI (Grok)',      hint: 'Grok-2, Grok-3',       envKey: 'XAI_API_KEY',        prefix: 'xai-'    },
  { id: 'gemini',    label: 'Google Gemini',   hint: 'Gemini 1.5, 2.0',      envKey: 'GEMINI_API_KEY',     prefix: 'AIzaSy'  },
  { id: 'mistral',   label: 'Mistral',         hint: 'Mistral Large, Codestral', envKey: 'MISTRAL_API_KEY', prefix: ''        },
  { id: 'cohere',    label: 'Cohere',          hint: 'Command R+',           envKey: 'COHERE_API_KEY',     prefix: ''        },
] as const;

export type ProviderId = typeof AI_PROVIDERS[number]['id'];

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 6) + '••••••••••••' + key.slice(-4);
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── AI Provider Keys ────────────────────────────────────────────────────────

  async getAiProviderKeys(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiProviderKeys: true },
    });

    const stored: Record<string, string> = org?.aiProviderKeys
      ? JSON.parse(org.aiProviderKeys)
      : {};

    return AI_PROVIDERS.map(p => {
      const dbVal   = stored[p.id] ?? '';
      const envVal  = process.env[p.envKey] ?? '';
      const active  = dbVal || envVal;
      return {
        id:      p.id,
        label:   p.label,
        hint:    p.hint,
        prefix:  p.prefix,
        isSet:   !!active,
        masked:  active ? maskKey(active) : null,
        source:  dbVal ? 'db' : (envVal ? 'env' : 'none'),
      };
    });
  }

  async updateAiProviderKeys(
    organizationId: string,
    updates: Partial<Record<ProviderId, string>>,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { aiProviderKeys: true },
    });

    const existing: Record<string, string> = org?.aiProviderKeys
      ? JSON.parse(org.aiProviderKeys)
      : {};

    for (const [id, val] of Object.entries(updates)) {
      if (val === '') {
        delete existing[id];           // empty string = clear the key
      } else if (val) {
        existing[id] = val.trim();
        // Also update live process.env so agents pick it up immediately
        const meta = AI_PROVIDERS.find(p => p.id === id);
        if (meta) process.env[meta.envKey] = val.trim();
      }
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data:  { aiProviderKeys: JSON.stringify(existing) },
    });

    // Also persist to .env file so keys survive server restarts
    this.writeEnvFile(existing);

    return { success: true };
  }

  private writeEnvFile(keyMap: Record<string, string>) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (!fs.existsSync(envPath)) return;

      let content = fs.readFileSync(envPath, 'utf8');

      for (const p of AI_PROVIDERS) {
        const val = keyMap[p.id];
        if (val === undefined) continue; // not in this update batch
        const line = `${p.envKey}=${val}`;
        const regex = new RegExp(`^${p.envKey}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, line);
        } else {
          content += `\n${line}`;
        }
      }

      fs.writeFileSync(envPath, content, 'utf8');
    } catch {
      // Non-fatal — DB save succeeded, env file write failed silently
    }
  }

  // ── Personal API Keys (SellBodr access tokens) ───────────────────────────

  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    });
  }

  async createApiKey(userId: string, name: string) {
    const raw       = `bsa_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash   = crypto.createHash('sha256').update(raw).digest('hex');
    const keyPrefix = raw.slice(0, KEY_PREFIX_LEN + 4);

    const key = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, keyPrefix },
    });

    return { id: key.id, name: key.name, keyPrefix: key.keyPrefix, key: raw, createdAt: key.createdAt };
  }

  async deleteApiKey(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id: keyId } });
    return { success: true };
  }
}
