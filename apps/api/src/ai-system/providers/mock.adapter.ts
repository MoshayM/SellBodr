import { Logger } from '@nestjs/common';
import {
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  TokenEstimate,
} from '../types';
import { IAiProviderAdapter } from './provider.interface';

// Used in dev/test when no API keys are configured
export class MockAdapter implements IAiProviderAdapter {
  readonly name = 'mock';
  readonly defaultModel = 'mock-v1';
  private readonly logger = new Logger('MockAdapter');

  async call(request: ProviderRequest): Promise<ProviderResponse> {
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    const lastUser = [...request.messages].reverse().find(m => m.role === 'user');
    const prompt = typeof lastUser?.content === 'string' ? lastUser.content : 'task';

    const content = prompt.toLowerCase().includes('json')
      ? JSON.stringify({ result: 'mock', confidence: 85, validated: true })
      : `Mock response for: ${prompt.substring(0, 60)}...`;

    const tokensIn = Math.ceil((prompt.length || 100) / 4);
    const tokensOut = Math.ceil(content.length / 4);

    this.logger.debug(`MockAdapter call: in=${tokensIn} out=${tokensOut}`);

    return {
      content,
      model: this.defaultModel,
      tokensIn,
      tokensOut,
      costUsd: 0,
      latencyMs: 50 + Math.floor(Math.random() * 100),
    };
  }

  estimateTokens(text: string): TokenEstimate {
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = Math.ceil(inputTokens * 0.3);
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostUsd: 0 };
  }

  estimateCost(_estimate: TokenEstimate): number { return 0; }
  isAvailable(): boolean { return true; }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsVision: true,
      supportsJson: true,
      supportsStreaming: false,
      supportsFunctionCalling: true,
      contextWindow: 1_000_000,
      maxOutputTokens: 8192,
      rpmLimit: 99999,
      tpmLimit: 99999,
    };
  }
}
