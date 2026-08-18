/**
 * Multi-LLM AI Gateway — fetch-based, zero SDK dependencies.
 *
 * Supported providers (all gracefully degrade if key absent / credits exhausted):
 *   Anthropic  (ANTHROPIC_API_KEY)  — Claude models, highest reasoning quality
 *   OpenAI     (OPENAI_API_KEY)     — GPT-4o family, strong general analysis
 *   Groq       (GROQ_API_KEY)       — Llama/Mixtral, fast & free-tier
 *   Mistral    (MISTRAL_API_KEY)    — Mistral models, good for European markets
 *
 * Ensemble principles:
 *   1. Run discovery in parallel across all available providers.
 *   2. Deduplicate by product title similarity (Jaccard ≥ 0.4 = same product).
 *   3. Consensus boost: products agreed on by N providers get +15×N confidence.
 *   4. Cross-model validation uses the best available provider that did NOT do discovery.
 *   5. Any provider that errors (rate limit, credits, key invalid) is silently skipped.
 */

// ── Provider registry ─────────────────────────────────────────────────────────

export interface Provider {
  id:              string;
  name:            string;
  quality:         number;   // 0–1, used for weighted scoring & provider priority
  discoveryModel:  string;
  validationModel: string;
  available: () => boolean;
  callJSON: <T>(model: string, messages: ChatMessage[], opts?: CallOpts, keyOverride?: string) => Promise<T>;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type CallOpts    = { temperature?: number; maxTokens?: number };

// ── Anthropic (Claude) ────────────────────────────────────────────────────────

async function callAnthropic<T>(model: string, messages: ChatMessage[], opts: CallOpts = {}, _keyOverride?: string): Promise<T> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const system = messages.find(m => m.role === 'system')?.content ?? '';
  const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2000,
      ...(system ? { system } : {}),
      messages: userMsgs,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as any;
  const text = data.content?.[0]?.text ?? '';
  return extractJSON<T>(text);
}

// ── OpenAI-compatible (OpenAI, Groq, Mistral, Together) ──────────────────────

function makeOpenAICompat(baseUrl: string, envKey: string) {
  return async function<T>(model: string, messages: ChatMessage[], opts: CallOpts = {}, keyOverride?: string): Promise<T> {
    const key = keyOverride?.trim() || process.env[envKey]?.trim();
    if (!key) throw new Error(`${envKey} not set`);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.1,
        max_tokens:  opts.maxTokens  ?? 2000,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${baseUrl.split('/')[2]} ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content ?? '';
    return extractJSON<T>(text);
  };
}

const callOpenAI  = makeOpenAICompat('https://api.openai.com/v1/chat/completions',          'OPENAI_API_KEY');
const callGroq    = makeOpenAICompat('https://api.groq.com/openai/v1/chat/completions',      'GROQ_API_KEY');
const callMistral = makeOpenAICompat('https://api.mistral.ai/v1/chat/completions',           'MISTRAL_API_KEY');

// ── Provider list (ordered by quality; first = preferred for validation) ──────

/** IDs of providers that have a free/generous tier — safe to use for non-Pro accounts. */
export const FREE_PROVIDER_IDS = ['groq', 'mistral'] as const;

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic', name: 'Claude (Anthropic)', quality: 0.95,
    discoveryModel:  'claude-haiku-4-5-20251001',
    validationModel: 'claude-sonnet-4-6',
    available: () => !!process.env.ANTHROPIC_API_KEY?.trim(),
    callJSON: callAnthropic,
  },
  {
    id: 'openai', name: 'GPT-4o (OpenAI)', quality: 0.90,
    discoveryModel:  'gpt-4o-mini',
    validationModel: 'gpt-4o',
    available: () => !!process.env.OPENAI_API_KEY?.trim(),
    callJSON: callOpenAI,
  },
  {
    id: 'mistral', name: 'Mistral', quality: 0.78,
    discoveryModel:  'mistral-small-latest',
    validationModel: 'mistral-medium-latest',
    available: () => !!process.env.MISTRAL_API_KEY?.trim(),
    callJSON: callMistral,
  },
  {
    id: 'groq', name: 'Groq (Llama)', quality: 0.75,
    discoveryModel:  'llama-3.1-8b-instant',
    validationModel: 'llama-3.3-70b-versatile',
    available: () => !!process.env.GROQ_API_KEY?.trim(),
    callJSON: callGroq,
  },
];

// ── JSON extractor ────────────────────────────────────────────────────────────

function extractJSON<T>(text: string): T {
  const arr = text.match(/\[[\s\S]*\]/)?.[0];
  const obj = text.match(/\{[\s\S]*\}/)?.[0];
  const raw = arr ?? obj;
  if (!raw) throw new Error(`No JSON found in: ${text.slice(0, 300)}`);
  try { return JSON.parse(raw) as T; }
  catch { throw new Error(`JSON parse failed: ${raw.slice(0, 300)}`); }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Run a single provider's JSON call with graceful error handling. Returns null on failure. */
export async function tryProvider<T>(
  provider: Provider,
  model: string,
  messages: ChatMessage[],
  opts?: CallOpts,
  keyOverride?: string,
): Promise<{ provider: Provider; result: T } | null> {
  try {
    const result = await provider.callJSON<T>(model, messages, opts, keyOverride);
    return { provider, result };
  } catch (err) {
    console.warn(`[gateway] ${provider.name} failed:`, String(err).slice(0, 120));
    return null;
  }
}

/** Run all available providers in parallel and return every successful result.
 *  Pass `freeOnly: true` to restrict to Groq + Mistral — never charge paid provider credits. */
export async function callAllProviders<T>(
  messages: ChatMessage[],
  opts?: CallOpts & { discoveryOnly?: boolean; guestKeys?: Record<string, string>; freeOnly?: boolean },
): Promise<Array<{ provider: Provider; result: T }>> {
  const guestKeys = opts?.guestKeys ?? {};
  const freeOnly  = opts?.freeOnly ?? false;
  const { guestKeys: _gk, freeOnly: _fo, ...callOpts } = opts ?? {};

  let pool = PROVIDERS;
  if (freeOnly) pool = pool.filter(p => (FREE_PROVIDER_IDS as readonly string[]).includes(p.id));

  const available = pool.filter(p => p.available() || !!guestKeys[p.id]);
  if (available.length === 0) throw new Error(
    freeOnly
      ? 'No free AI providers available — set GROQ_API_KEY or MISTRAL_API_KEY, or supply a key in Settings'
      : 'No AI providers configured — set at least GROQ_API_KEY or configure a free key in Settings'
  );

  const results = await Promise.all(
    available.map(p => tryProvider<T>(p, p.discoveryModel, messages, callOpts, guestKeys[p.id]))
  );
  return results.filter((r): r is { provider: Provider; result: T } => r !== null);
}

/** Call a single provider's validation model — prefers highest quality available, skips discovery providers.
 *  Pass `freeOnly: true` to restrict to Groq + Mistral only. */
export async function callBestValidator<T>(
  excludeProviderIds: string[],
  messages: ChatMessage[],
  opts?: CallOpts & { guestKeys?: Record<string, string>; freeOnly?: boolean },
): Promise<{ provider: Provider; result: T } | null> {
  const guestKeys = opts?.guestKeys ?? {};
  const freeOnly  = opts?.freeOnly ?? false;
  const { guestKeys: _gk, freeOnly: _fo, ...callOpts } = opts ?? {};

  let pool = PROVIDERS;
  if (freeOnly) pool = pool.filter(p => (FREE_PROVIDER_IDS as readonly string[]).includes(p.id));

  const isAvail = (p: Provider) => p.available() || !!guestKeys[p.id];

  const candidates = pool
    .filter(p => isAvail(p) && !excludeProviderIds.includes(p.id))
    .sort((a, b) => b.quality - a.quality);

  const validators = candidates.length > 0
    ? candidates
    : pool.filter(p => isAvail(p)).sort((a, b) => b.quality - a.quality).slice(0, 1);

  for (const p of validators) {
    const res = await tryProvider<T>(p, p.validationModel, messages, callOpts, guestKeys[p.id]);
    if (res) return res;
  }
  return null;
}

/** Return a filtered provider list safe for free/guest calls (Groq + Mistral only). */
export function getFreeProviders(): Provider[] {
  return PROVIDERS.filter(p => (FREE_PROVIDER_IDS as readonly string[]).includes(p.id) && p.available());
}

/** Return all available providers (for Pro/Admin users). */
export function getAllProviders(): Provider[] {
  return PROVIDERS.filter(p => p.available());
}

/** Product title similarity using Jaccard index on word tokens. ≥ 0.4 = same product. */
export function titleSimilarity(a: string, b: string): number {
  const tokens = (s: string) => new Set(s.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const A = tokens(a), B = tokens(b);
  const inter = [...A].filter(w => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

// ── Legacy exports (keep backward-compat) ─────────────────────────────────────

export const MODELS = {
  FLASH:    'llama-3.1-8b-instant',
  BALANCED: 'llama-3.1-8b-instant',
  CAPABLE:  'llama-3.3-70b-versatile',
} as const;

export async function groqChat(
  model: string,
  messages: ChatMessage[],
  opts: CallOpts = {}
): Promise<string> {
  const groq = PROVIDERS.find(p => p.id === 'groq')!;
  const result = await groq.callJSON<string>(model, messages, opts).catch(() => '');
  return typeof result === 'string' ? result : JSON.stringify(result);
}

export async function groqJSON<T>(
  model: string,
  messages: ChatMessage[],
  opts: CallOpts = {}
): Promise<T> {
  const groq = PROVIDERS.find(p => p.id === 'groq')!;
  return groq.callJSON<T>(model, messages, opts);
}
