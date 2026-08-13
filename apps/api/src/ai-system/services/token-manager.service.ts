import { Injectable, Logger } from '@nestjs/common';
import { TokenEstimate } from '../types';

const CHARS_PER_TOKEN = 4; // conservative English estimate
const MAX_ALLOWED_TOKENS = 100_000; // hard safety cap

@Injectable()
export class TokenManagerService {
  private readonly logger = new Logger('TokenManagerService');

  estimate(text: string): TokenEstimate {
    const inputTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
    const outputTokens = Math.ceil(inputTokens * 0.35);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: 0, // provider-specific cost set by ProviderSelector
    };
  }

  estimateMessages(messages: Array<{ role: string; content: string | unknown[] }>): number {
    return messages.reduce((acc, m) => {
      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return acc + Math.ceil(text.length / CHARS_PER_TOKEN);
    }, 0);
  }

  // Reject if the request would exceed the hard cap
  validate(estimate: TokenEstimate): void {
    if (estimate.inputTokens > MAX_ALLOWED_TOKENS) {
      throw new Error(`Request rejected: ${estimate.inputTokens} tokens exceeds hard limit of ${MAX_ALLOWED_TOKENS}`);
    }
  }

  // Truncate text to fit within a target token budget
  truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    if (text.length <= maxChars) return text;
    this.logger.warn(`Truncating text from ${text.length} to ${maxChars} chars (~${maxTokens} tokens)`);
    return text.substring(0, maxChars - 100) + '\n\n[...truncated for token budget]';
  }

  // Remove repeated whitespace, compress JSON, strip comments
  compress(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
