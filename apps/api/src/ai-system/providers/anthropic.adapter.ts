import { Logger } from '@nestjs/common';
import {
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  TokenEstimate,
} from '../types';
import { IAiProviderAdapter } from './provider.interface';

// Pricing per million tokens (as of 2025)
const MODELS: Record<string, { inputPer1M: number; outputPer1M: number; contextWindow: number; maxOutput: number }> = {
  'claude-sonnet-4-6':   { inputPer1M: 3.00,  outputPer1M: 15.00, contextWindow: 200000, maxOutput: 8192 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.80,  outputPer1M: 4.00,  contextWindow: 200000, maxOutput: 8192 },
  'claude-opus-4-8':     { inputPer1M: 15.00, outputPer1M: 75.00, contextWindow: 200000, maxOutput: 4096 },
};

export class AnthropicAdapter implements IAiProviderAdapter {
  readonly name = 'anthropic';
  readonly defaultModel = 'claude-haiku-4-5-20251001';
  private readonly logger = new Logger('AnthropicAdapter');

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-haiku-4-5-20251001',
  ) {}

  async call(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) throw new Error('Anthropic API key not configured');
    const start = Date.now();

    const system = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: Math.min(request.maxTokens || 1024, MODELS[this.model]?.maxOutput || 4096),
      messages: userMessages.map(m => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.map(b => b.type === 'image_url'
              ? { type: 'image', source: { type: 'url', url: b.image_url!.url } }
              : { type: 'text', text: b.text })
          : m.content,
      })),
    };
    if (system) body.system = typeof system.content === 'string' ? system.content : JSON.stringify(system.content);
    if (request.jsonMode) {
      // Anthropic uses a hint in the system prompt for JSON
      body.system = `${body.system || ''}\n\nRespond with valid JSON only. No markdown, no explanations.`.trim();
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data: any = await res.json();
    const content = data.content?.[0]?.text ?? '';
    const tokensIn = data.usage?.input_tokens ?? 0;
    const tokensOut = data.usage?.output_tokens ?? 0;
    const pricing = MODELS[this.model] ?? MODELS['claude-haiku-4-5-20251001'];
    const costUsd = (tokensIn / 1_000_000) * pricing.inputPer1M + (tokensOut / 1_000_000) * pricing.outputPer1M;
    const latencyMs = Date.now() - start;

    this.logger.debug(`Anthropic call: model=${this.model} in=${tokensIn} out=${tokensOut} cost=$${costUsd.toFixed(5)} latency=${latencyMs}ms`);

    return { content, model: this.model, tokensIn, tokensOut, costUsd, latencyMs };
  }

  estimateTokens(text: string): TokenEstimate {
    // ~4 chars per token for English text
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = Math.ceil(inputTokens * 0.3);
    const pricing = MODELS[this.model] ?? MODELS['claude-haiku-4-5-20251001'];
    const estimatedCostUsd = (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostUsd };
  }

  estimateCost(estimate: TokenEstimate): number {
    const pricing = MODELS[this.model] ?? MODELS['claude-haiku-4-5-20251001'];
    return (estimate.inputTokens / 1_000_000) * pricing.inputPer1M + (estimate.outputTokens / 1_000_000) * pricing.outputPer1M;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  getCapabilities(): ProviderCapabilities {
    const m = MODELS[this.model] ?? MODELS['claude-haiku-4-5-20251001'];
    return {
      supportsVision: true,
      supportsJson: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutput,
      rpmLimit: 50,
      tpmLimit: 100_000,
    };
  }
}
