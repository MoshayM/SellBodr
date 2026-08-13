/**
 * Groq AI Gateway — fetch-based, no SDK dependency.
 *
 * Model routing by task cost-effectiveness:
 *   FLASH    = llama-3.1-8b-instant   → ~130k TPM free — JSON extraction, classification, quick tasks
 *   BALANCED = mixtral-8x7b-32768     → ~5k TPM free   — scoring analysis, medium reasoning
 *   CAPABLE  = llama-3.1-70b-versatile → ~6k TPM free  — listing copy, reports, complex generation
 */

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

export const MODELS = {
  FLASH:    'llama-3.1-8b-instant',      // Fast & free — use for product discovery, classification
  BALANCED: 'mixtral-8x7b-32768',        // Reasoning — use for market analysis, scoring context
  CAPABLE:  'llama-3.1-70b-versatile',   // Creative — use for listing copy, brand names, reports
} as const;

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

function apiKey(): string {
  const k = process.env.GROQ_API_KEY?.replace(/^﻿/, '').trim();
  if (!k) throw new Error('GROQ_API_KEY is not set — configure it in Vercel environment variables');
  return k;
}

export async function groqChat(
  model: string,
  messages: Message[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? '';
}

export async function groqJSON<T>(
  model: string,
  messages: Message[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const text = await groqChat(model, messages, { temperature: 0.05, ...opts });
  const arr = text.match(/\[[\s\S]*\]/)?.[0];
  const obj = text.match(/\{[\s\S]*\}/)?.[0];
  const raw = arr ?? obj;
  if (!raw) throw new Error(`No JSON in response: ${text.slice(0, 300)}`);
  return JSON.parse(raw) as T;
}
