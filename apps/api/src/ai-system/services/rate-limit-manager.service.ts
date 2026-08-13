import { Injectable, Logger } from '@nestjs/common';
import { RateLimitState } from '../types';

const PROVIDER_LIMITS: Record<string, { rpm: number; tpm: number }> = {
  anthropic: { rpm: 50,  tpm: 100_000 },
  openai:    { rpm: 500, tpm: 200_000 },
  mock:      { rpm: 99999, tpm: 99_999_999 },
};

@Injectable()
export class RateLimitManagerService {
  private readonly logger = new Logger('RateLimitManagerService');
  private readonly state = new Map<string, RateLimitState>();

  private now(): number { return Date.now(); }
  private currentMinute(): number { return Math.floor(this.now() / 60_000); }
  private currentDay(): number { return Math.floor(this.now() / 86_400_000); }

  private getState(provider: string): RateLimitState {
    let s = this.state.get(provider);
    const minute = this.currentMinute();
    const day = this.currentDay();
    if (!s) {
      s = { provider, requestsThisMinute: 0, tokensThisMinute: 0, requestsToday: 0, tokensThisMonth: 0, lastResetMinute: minute, lastResetDay: day };
      this.state.set(provider, s);
    }
    if (s.lastResetMinute !== minute) {
      s.requestsThisMinute = 0; s.tokensThisMinute = 0; s.lastResetMinute = minute;
    }
    if (s.lastResetDay !== day) {
      s.requestsToday = 0; s.lastResetDay = day;
    }
    return s;
  }

  isThrottled(provider: string): boolean {
    const s = this.getState(provider);
    if (s.throttledUntil && s.throttledUntil > this.now()) return true;
    s.throttledUntil = undefined;
    return false;
  }

  consume(provider: string, tokens: number): void {
    const s = this.getState(provider);
    const limits = PROVIDER_LIMITS[provider] ?? { rpm: 50, tpm: 100_000 };
    s.requestsThisMinute++;
    s.tokensThisMinute += tokens;
    s.requestsToday++;
    s.tokensThisMonth += tokens;

    if (s.requestsThisMinute >= limits.rpm || s.tokensThisMinute >= limits.tpm) {
      const retryAfter = (this.currentMinute() + 1) * 60_000;
      s.throttledUntil = retryAfter;
      this.logger.warn(`Rate limit hit for ${provider} — throttled until ${new Date(retryAfter).toISOString()}`);
    }
  }

  recordThrottle(provider: string, retryAfterMs = 60_000): void {
    const s = this.getState(provider);
    s.throttledUntil = this.now() + retryAfterMs;
    this.logger.warn(`Provider ${provider} throttled for ${retryAfterMs}ms (HTTP 429)`);
  }

  getStats(provider: string): RateLimitState {
    return this.getState(provider);
  }
}
