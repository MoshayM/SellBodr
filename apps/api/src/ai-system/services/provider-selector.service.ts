import { Injectable, Logger } from '@nestjs/common';
import { ProviderFactory } from '../providers/provider.factory';
import { IAiProviderAdapter } from '../providers/provider.interface';
import { LearningEngineService } from './learning-engine.service';
import { RateLimitManagerService } from './rate-limit-manager.service';
import { TaskRequirements, ProviderScore } from '../types';

@Injectable()
export class ProviderSelectorService {
  private readonly logger = new Logger('ProviderSelectorService');

  constructor(
    private readonly factory: ProviderFactory,
    private readonly learning: LearningEngineService,
    private readonly rateLimit: RateLimitManagerService,
  ) {}

  select(requirements: TaskRequirements): IAiProviderAdapter {
    const candidates = this.factory.getUniqueAvailable();
    const scored = this.scoreAll(candidates, requirements);

    if (scored.length === 0) {
      this.logger.warn('No providers available — falling back to mock');
      return this.factory.get('mock');
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    this.logger.debug(`Selected provider: ${best.providerName} (score=${best.score.toFixed(2)}, model=${best.model}, est_cost=$${best.estimatedCostUsd.toFixed(5)})`);

    // Find the adapter matching the selected provider
    const adapter = candidates.find(a => a.name === best.providerName);
    return adapter ?? this.factory.get('mock');
  }

  private scoreAll(providers: IAiProviderAdapter[], req: TaskRequirements): ProviderScore[] {
    return providers
      .filter(p => this.meetsRequirements(p, req))
      .filter(p => !this.rateLimit.isThrottled(p.name))
      .map(p => this.scoreProvider(p, req));
  }

  private meetsRequirements(p: IAiProviderAdapter, req: TaskRequirements): boolean {
    const caps = p.getCapabilities();
    if (req.requireVision && !caps.supportsVision) return false;
    if (req.requireJson && !caps.supportsJson) return false;
    if (req.requireStreaming && !caps.supportsStreaming) return false;
    if (req.requireFunctionCalling && !caps.supportsFunctionCalling) return false;
    if (req.estimatedInputTokens + req.estimatedOutputTokens > caps.contextWindow) return false;
    if (req.allowedProviders && !req.allowedProviders.includes(p.name)) return false;
    return true;
  }

  private scoreProvider(p: IAiProviderAdapter, req: TaskRequirements): ProviderScore {
    const caps = p.getCapabilities();
    const estimate = p.estimateTokens(' '.repeat(req.estimatedInputTokens * 4));
    estimate.outputTokens = req.estimatedOutputTokens;
    const costUsd = p.estimateCost(estimate);
    const reasons: string[] = [];
    let score = 50; // base

    // Cost: lower is better (up to +20 pts)
    const maxCost = req.maxCostUsd || 0.10;
    const costRatio = costUsd / maxCost;
    if (costRatio <= 0.1) { score += 20; reasons.push('very low cost'); }
    else if (costRatio <= 0.3) { score += 10; reasons.push('low cost'); }
    else if (costRatio > 1) { score -= 20; reasons.push('over budget'); }

    // Historical performance from learning engine
    const perf = this.learning.getPerformance(p.name, req.estimatedInputTokens);
    if (perf) {
      const successBonus = perf.successRate * 20;
      score += successBonus;
      reasons.push(`historical success ${(perf.successRate * 100).toFixed(0)}%`);

      const latencyPenalty = perf.avgLatencyMs > req.maxLatencyMs ? -15 : 0;
      score += latencyPenalty;
      if (latencyPenalty < 0) reasons.push('historically slow');
    }

    // Context window fitness (+5 if plenty of headroom)
    const tokenUsage = (req.estimatedInputTokens + req.estimatedOutputTokens) / caps.contextWindow;
    if (tokenUsage < 0.2) { score += 5; reasons.push('large context window'); }

    // Complexity matching
    const complexityScore = { simple: 1, moderate: 2, complex: 3, expert: 4 }[req.complexity] ?? 2;
    if (p.name === 'anthropic' && complexityScore >= 3) { score += 10; reasons.push('strong reasoning'); }
    if (p.name === 'openai' && complexityScore >= 3) { score += 8; reasons.push('capable model'); }
    if (p.name === 'mock') { score -= 30; reasons.push('mock — dev only'); }

    // Vision tasks: prefer anthropic (claude vision is excellent)
    if (req.requireVision && p.name === 'anthropic') { score += 10; reasons.push('excellent vision'); }

    return {
      providerName: p.name,
      model: p.defaultModel,
      score,
      estimatedCostUsd: costUsd,
      estimatedLatencyMs: perf?.avgLatencyMs ?? 2000,
      reasons,
    };
  }
}
