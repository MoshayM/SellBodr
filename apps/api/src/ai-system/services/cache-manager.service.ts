import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiTask, CacheEntry } from '../types';

// TTL per task type (ms)
const CACHE_TTL: Record<string, number> = {
  trend_analysis:      6 * 3600 * 1000,   // 6h  — market trends don't change hourly
  competitor_analysis: 4 * 3600 * 1000,   // 4h
  supplier_search:     12 * 3600 * 1000,  // 12h — supplier data is stable
  seo:                 24 * 3600 * 1000,  // 24h — keywords are stable
  image_validation:    7 * 24 * 3600 * 1000, // 7d — images don't change
  product_research:    2 * 3600 * 1000,   // 2h
  report_generation:   1 * 3600 * 1000,   // 1h
  recommendation:      2 * 3600 * 1000,   // 2h
  chat:                0,                 // never cache chat
  default:             3600 * 1000,       // 1h default
};

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger('CacheManagerService');
  private readonly store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  get(task: AiTask): CacheEntry | null {
    if (task.skipCache) return null;
    const key = this.buildKey(task);
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return null; }

    const expired = Date.now() - entry.createdAt > entry.ttlMs;
    if (expired) { this.store.delete(key); this.misses++; return null; }

    entry.hitCount++;
    this.hits++;
    this.logger.debug(`Cache HIT key=${key.slice(0, 12)}... hits=${entry.hitCount}`);
    return entry;
  }

  set(task: AiTask, content: string, meta: { provider: string; model: string; tokensIn: number; tokensOut: number; costUsd: number }): void {
    const ttl = CACHE_TTL[task.type] ?? CACHE_TTL['default'];
    if (ttl === 0) return; // task type is not cacheable

    const key = this.buildKey(task);
    this.store.set(key, {
      key,
      content,
      provider: meta.provider,
      model: meta.model,
      tokensIn: meta.tokensIn,
      tokensOut: meta.tokensOut,
      costUsd: meta.costUsd,
      createdAt: Date.now(),
      ttlMs: ttl,
      hitCount: 0,
    });
    this.logger.debug(`Cache SET key=${key.slice(0, 12)}... ttl=${ttl / 1000}s`);
  }

  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) { this.store.delete(key); count++; }
    }
    this.logger.log(`Invalidated ${count} cache entries matching "${pattern}"`);
    return count;
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return { size: this.store.size, hits: this.hits, misses: this.misses, hitRate: total > 0 ? this.hits / total : 0 };
  }

  private buildKey(task: AiTask): string {
    const raw = task.cacheKey ?? [task.type, task.prompt, task.marketplace ?? '', task.productId ?? ''].join('|');
    return createHash('sha256').update(raw).digest('hex');
  }
}
