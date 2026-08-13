import { Logger } from '@nestjs/common';
import {
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  TokenEstimate,
} from '../types';
import { IAiProviderAdapter } from './provider.interface';

const MODELS: Record<string, { inputPer1M: number; outputPer1M: number; contextWindow: number; maxOutput: number }> = {
  'gpt-4o-mini': { inputPer1M: 0.15,  outputPer1M: 0.60,  contextWindow: 128000, maxOutput: 16384 },
  'gpt-4o':      { inputPer1M: 2.50,  outputPer1M: 10.00, contextWindow: 128000, maxOutput: 4096  },
  'gpt-4-turbo': { inputPer1M: 10.00, outputPer1M: 30.00, contextWindow: 128000, maxOutput: 4096  },
  'gpt-3.5-turbo': { inputPer1M: 0.50, outputPer1M: 1.50, contextWindow: 16385, maxOutput: 4096   },
};

export class OpenAiAdapter implements IAiProviderAdapter {
  readonly name = 'openai';
  readonly defaultModel = 'gpt-4o-mini';
  private readonly logger = new Logger('OpenAiAdapter');

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4o-mini',
  ) {}

  async call(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) throw new Error('OpenAI API key not configured');
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: Math.min(request.maxTokens || 1024, MODELS[this.model]?.maxOutput || 4096),
      messages: request.messages.map(m => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.map(b => b.type === 'image_url'
              ? { type: 'image_url', image_url: b.image_url }
              : { type: 'text', text: b.text })
          : m.content,
      })),
    };
    if (request.jsonMode) body.response_format = { type: 'json_object' };
    if (request.temperature !== undefined) body.temperature = request.temperature;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    const pricing = MODELS[this.model] ?? MODELS['gpt-4o-mini'];
    const costUsd = (tokensIn / 1_000_000) * pricing.inputPer1M + (tokensOut / 1_000_000) * pricing.outputPer1M;
    const latencyMs = Date.now() - start;

    this.logger.debug(`OpenAI call: model=${this.model} in=${tokensIn} out=${tokensOut} cost=$${costUsd.toFixed(5)} latency=${latencyMs}ms`);

    return { content, model: this.model, tokensIn, tokensOut, costUsd, latencyMs };
  }

  estimateTokens(text: string): TokenEstimate {
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = Math.ceil(inputTokens * 0.3);
    const pricing = MODELS[this.model] ?? MODELS['gpt-4o-mini'];
    const estimatedCostUsd = (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostUsd };
  }

  estimateCost(estimate: TokenEstimate): number {
    const pricing = MODELS[this.model] ?? MODELS['gpt-4o-mini'];
    return (estimate.inputTokens / 1_000_000) * pricing.inputPer1M + (estimate.outputTokens / 1_000_000) * pricing.outputPer1M;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  getCapabilities(): ProviderCapabilities {
    const m = MODELS[this.model] ?? MODELS['gpt-4o-mini'];
    return {
      supportsVision: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'].includes(this.model),
      supportsJson: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutput,
      rpmLimit: 500,
      tpmLimit: 200_000,
    };
  }
}
