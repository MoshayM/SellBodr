import { Injectable } from '@nestjs/common';
import { ProviderMetrics, SystemMetrics } from '../types';
import { CacheManagerService } from './cache-manager.service';
import { RateLimitManagerService } from './rate-limit-manager.service';
import { LearningEngineService } from './learning-engine.service';

interface RequestRecord {
  provider: string;
  latencyMs: number;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  success: boolean;
  cacheHit: boolean;
  validationPassed: boolean;
  ts: number;
}

@Injectable()
export class MonitoringService {
  private readonly records: RequestRecord[] = [];
  private readonly startTime = Date.now();

  constructor(
    private readonly cache: CacheManagerService,
    private readonly rateLimit: RateLimitManagerService,
    private readonly learning: LearningEngineService,
  ) {}

  record(data: Omit<RequestRecord, 'ts'>): void {
    this.records.push({ ...data, ts: Date.now() });
    if (this.records.length > 10_000) this.records.shift(); // rolling window
  }

  getSystemMetrics(): SystemMetrics {
    const cacheStats = this.cache.getStats();
    const byProvider = this.groupByProvider();
    const all = this.records;
    const successes = all.filter(r => r.success);

    return {
      providers: byProvider,
      totalRequests: all.length,
      totalCostUsd: all.reduce((s, r) => s + r.costUsd, 0),
      cacheHitRate: cacheStats.hitRate,
      avgLatencyMs: all.length > 0 ? all.reduce((s, r) => s + r.latencyMs, 0) / all.length : 0,
      validationSuccessRate: all.length > 0 ? all.filter(r => r.validationPassed).length / all.length : 1,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  getProviderHealth(): Array<{ provider: string; healthy: boolean; throttled: boolean; rpm: number; tpm: number }> {
    const providers = ['anthropic', 'openai', 'mock'];
    return providers.map(p => {
      const stats = this.rateLimit.getStats(p);
      return {
        provider: p,
        healthy: !this.rateLimit.isThrottled(p),
        throttled: this.rateLimit.isThrottled(p),
        rpm: stats.requestsThisMinute,
        tpm: stats.tokensThisMinute,
      };
    });
  }

  getDashboard(): Record<string, unknown> {
    return {
      system: this.getSystemMetrics(),
      providerHealth: this.getProviderHealth(),
      cache: this.cache.getStats(),
      learning: this.learning.getSummary(),
      recentErrors: this.records.filter(r => !r.success).slice(-20).map(r => ({ provider: r.provider, ts: r.ts })),
    };
  }

  private groupByProvider(): ProviderMetrics[] {
    const map = new Map<string, RequestRecord[]>();
    for (const r of this.records) {
      const arr = map.get(r.provider) ?? [];
      arr.push(r);
      map.set(r.provider, arr);
    }
    return Array.from(map.entries()).map(([provider, records]) => {
      const sorted = [...records].map(r => r.latencyMs).sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      return {
        provider,
        totalRequests: records.length,
        successRequests: records.filter(r => r.success).length,
        failedRequests: records.filter(r => !r.success).length,
        totalTokensIn: records.reduce((s, r) => s + r.tokensIn, 0),
        totalTokensOut: records.reduce((s, r) => s + r.tokensOut, 0),
        totalCostUsd: records.reduce((s, r) => s + r.costUsd, 0),
        avgLatencyMs: records.reduce((s, r) => s + r.latencyMs, 0) / (records.length || 1),
        cacheHits: records.filter(r => r.cacheHit).length,
        p95LatencyMs: p95,
      };
    });
  }
}
