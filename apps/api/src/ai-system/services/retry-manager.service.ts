import { Injectable, Logger } from '@nestjs/common';
import { RateLimitManagerService } from './rate-limit-manager.service';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10_000,
  backoffFactor: 2,
};

@Injectable()
export class RetryManagerService {
  private readonly logger = new Logger('RetryManagerService');

  constructor(private readonly rateLimit: RateLimitManagerService) {}

  async withRetry<T>(
    providerName: string,
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<{ result: T; retries: number }> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error | undefined;
    let delay = cfg.initialDelayMs;

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) this.logger.log(`Provider ${providerName} succeeded on attempt ${attempt + 1}`);
        return { result, retries: attempt };
      } catch (err: any) {
        lastError = err;
        const status = this.extractStatus(err);

        if (status === 429) {
          // Rate limited — tell rate limit manager and back off longer
          this.rateLimit.recordThrottle(providerName, delay * 2);
          this.logger.warn(`${providerName} rate limited (429) — backing off ${delay * 2}ms`);
        } else if (status && status >= 400 && status < 500 && status !== 429) {
          // Client error (bad request, auth, etc.) — don't retry
          throw err;
        }

        if (attempt < cfg.maxRetries) {
          this.logger.warn(`${providerName} attempt ${attempt + 1} failed (${err.message}) — retrying in ${delay}ms`);
          await this.sleep(delay);
          delay = Math.min(delay * cfg.backoffFactor, cfg.maxDelayMs);
        }
      }
    }

    throw lastError ?? new Error(`${providerName} failed after ${cfg.maxRetries} retries`);
  }

  private extractStatus(err: any): number | null {
    const msg = err?.message ?? '';
    const match = msg.match(/error (\d{3})/i);
    return match ? parseInt(match[1]) : null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
