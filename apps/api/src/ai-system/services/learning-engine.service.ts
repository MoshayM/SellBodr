import { Injectable, Logger } from '@nestjs/common';
import { LearningRecord, TaskType } from '../types';

interface ProviderPerf {
  provider: string;
  taskType: TaskType;
  sampleCount: number;
  successCount: number;
  totalLatencyMs: number;
  totalCostUsd: number;
  totalTokensIn: number;
  latencies: number[]; // for p95
}

@Injectable()
export class LearningEngineService {
  private readonly logger = new Logger('LearningEngineService');
  private readonly perf = new Map<string, ProviderPerf>();

  record(entry: LearningRecord): void {
    const key = `${entry.provider}:${entry.taskType}`;
    let p = this.perf.get(key);
    if (!p) {
      p = { provider: entry.provider, taskType: entry.taskType, sampleCount: 0, successCount: 0, totalLatencyMs: 0, totalCostUsd: 0, totalTokensIn: 0, latencies: [] };
      this.perf.set(key, p);
    }
    p.sampleCount++;
    if (entry.validationPassed && entry.retries === 0) p.successCount++;
    p.totalLatencyMs += entry.latencyMs;
    p.totalCostUsd += entry.costUsd;
    p.totalTokensIn += entry.tokensIn;
    p.latencies.push(entry.latencyMs);
    if (p.latencies.length > 200) p.latencies.shift(); // keep rolling window

    this.logger.debug(`Learning: ${entry.provider}/${entry.taskType} latency=${entry.latencyMs}ms cost=$${entry.costUsd.toFixed(5)} valid=${entry.validationPassed}`);
  }

  getPerformance(provider: string, _inputTokens: number): { successRate: number; avgLatencyMs: number; avgCostUsd: number; p95LatencyMs: number } | null {
    // Aggregate across all task types for this provider
    const entries = Array.from(this.perf.values()).filter(p => p.provider === provider);
    if (entries.length === 0 || entries[0].sampleCount < 3) return null;

    const total = entries.reduce((acc, p) => ({
      sampleCount: acc.sampleCount + p.sampleCount,
      successCount: acc.successCount + p.successCount,
      totalLatencyMs: acc.totalLatencyMs + p.totalLatencyMs,
      totalCostUsd: acc.totalCostUsd + p.totalCostUsd,
      latencies: [...acc.latencies, ...p.latencies],
    }), { sampleCount: 0, successCount: 0, totalLatencyMs: 0, totalCostUsd: 0, latencies: [] as number[] });

    const sorted = [...total.latencies].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);

    return {
      successRate: total.successCount / total.sampleCount,
      avgLatencyMs: total.totalLatencyMs / total.sampleCount,
      avgCostUsd: total.totalCostUsd / total.sampleCount,
      p95LatencyMs: sorted[p95Idx] ?? 0,
    };
  }

  getProviderRankings(): Array<{ provider: string; score: number; successRate: number; avgLatencyMs: number; avgCostUsd: number }> {
    const seen = new Map<string, { successRate: number; avgLatencyMs: number; avgCostUsd: number }>();
    for (const [, p] of this.perf) {
      if (p.sampleCount < 1) continue;
      const existing = seen.get(p.provider);
      if (!existing || p.sampleCount > (this.perf.get(`${p.provider}:${p.taskType}`)?.sampleCount ?? 0)) {
        const perf = this.getPerformance(p.provider, 500);
        if (perf) seen.set(p.provider, perf);
      }
    }
    return Array.from(seen.entries())
      .map(([provider, perf]) => ({
        provider,
        score: (perf.successRate * 50) + Math.max(0, 30 - perf.avgLatencyMs / 100) + Math.max(0, 20 - perf.avgCostUsd * 1000),
        ...perf,
      }))
      .sort((a, b) => b.score - a.score);
  }

  getSummary(): Record<string, unknown> {
    const rankings = this.getProviderRankings();
    return {
      totalSamples: Array.from(this.perf.values()).reduce((s, p) => s + p.sampleCount, 0),
      providerRankings: rankings,
    };
  }
}
