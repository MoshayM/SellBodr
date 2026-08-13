import { Injectable, Logger } from '@nestjs/common';
import { AiTask, AiResult, ProviderRequest, ProviderMessage } from '../types';
import { TaskAnalyzerService } from '../services/task-analyzer.service';
import { PromptOptimizerService } from '../services/prompt-optimizer.service';
import { ContextOptimizerService } from '../services/context-optimizer.service';
import { TokenManagerService } from '../services/token-manager.service';
import { BudgetManagerService } from '../services/budget-manager.service';
import { ProviderSelectorService } from '../services/provider-selector.service';
import { OutputValidatorService } from '../services/output-validator.service';
import { RetryManagerService } from '../services/retry-manager.service';
import { CacheManagerService } from '../services/cache-manager.service';
import { MonitoringService } from '../services/monitoring.service';
import { LearningEngineService } from '../services/learning-engine.service';
import { RateLimitManagerService } from '../services/rate-limit-manager.service';
import { ProviderFactory } from '../providers/provider.factory';

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger('AiOrchestrator');

  constructor(
    private readonly taskAnalyzer: TaskAnalyzerService,
    private readonly promptOptimizer: PromptOptimizerService,
    private readonly contextOptimizer: ContextOptimizerService,
    private readonly tokenManager: TokenManagerService,
    private readonly budgetManager: BudgetManagerService,
    private readonly providerSelector: ProviderSelectorService,
    private readonly outputValidator: OutputValidatorService,
    private readonly retryManager: RetryManagerService,
    private readonly cache: CacheManagerService,
    private readonly monitoring: MonitoringService,
    private readonly learning: LearningEngineService,
    private readonly rateLimit: RateLimitManagerService,
    private readonly providerFactory: ProviderFactory,
  ) {}

  // ── Main Entry Point ────────────────────────────────────────────────────────

  async run(task: AiTask): Promise<AiResult> {
    this.logger.log(`Orchestrating: type=${task.type} user=${task.userId ?? 'system'}`);

    // ── Step 1: Context Optimization ────────────────────────────────────────
    const ctxTask = this.contextOptimizer.optimize(task);

    // ── Step 2: Task Analysis ────────────────────────────────────────────────
    const requirements = this.taskAnalyzer.analyze(ctxTask);

    // ── Step 3: Token Estimation ─────────────────────────────────────────────
    const rawText = `${ctxTask.systemPrompt ?? ''}${ctxTask.prompt}`;
    const estimate = this.tokenManager.estimate(rawText);
    this.tokenManager.validate(estimate);

    // ── Step 4: Budget Check ─────────────────────────────────────────────────
    if (ctxTask.userId) {
      this.budgetManager.checkBudget(ctxTask.userId, estimate.estimatedCostUsd, 'unlimited', ctxTask.budgetUsd);
    }

    // ── Step 5: Cache Check ──────────────────────────────────────────────────
    const cached = this.cache.get(ctxTask);
    if (cached) {
      this.logger.debug(`Cache hit for task=${ctxTask.type}`);
      return {
        content: cached.content,
        provider: cached.provider,
        model: cached.model,
        tokensIn: cached.tokensIn,
        tokensOut: cached.tokensOut,
        costUsd: 0, // no cost for cache hits
        latencyMs: 0,
        cached: true,
        validated: true,
        retries: 0,
        validationWarnings: [],
      };
    }

    // ── Step 6: Provider Selection ───────────────────────────────────────────
    const provider = this.providerSelector.select(requirements);

    // ── Step 7: Prompt Optimization ──────────────────────────────────────────
    const { prompt, systemPrompt } = this.promptOptimizer.optimize(ctxTask, requirements.estimatedInputTokens);

    // ── Step 8: Build Provider Request ───────────────────────────────────────
    const messages = this.buildMessages(systemPrompt, prompt, ctxTask.images);
    const providerRequest: ProviderRequest = {
      messages,
      maxTokens: ctxTask.maxTokens ?? requirements.estimatedOutputTokens,
      temperature: 0.3,
      jsonMode: requirements.requireJson,
      stream: requirements.requireStreaming,
    };

    // ── Step 9: Execute with Retry ───────────────────────────────────────────
    let providerResponse: any;
    let retries = 0;
    try {
      const result = await this.retryManager.withRetry(
        provider.name,
        () => provider.call(providerRequest),
        { maxRetries: 3 },
      );
      providerResponse = result.result;
      retries = result.retries;
      this.rateLimit.consume(provider.name, providerResponse.tokensIn + providerResponse.tokensOut);
    } catch (err: any) {
      this.logger.error(`All retries exhausted for ${provider.name}: ${err.message}`);
      // Failover to next available provider
      providerResponse = await this.failover(providerRequest, provider.name);
    }

    // ── Step 10: Output Validation ───────────────────────────────────────────
    const validation = this.outputValidator.validate(
      providerResponse.content,
      requirements.requireJson,
      ctxTask.type,
    );

    // Auto-retry on validation failure (once)
    if (!validation.valid && retries < 2) {
      this.logger.warn(`Validation failed — attempting one corrective retry`);
      try {
        const correctedMessages = [...messages, { role: 'assistant' as const, content: providerResponse.content }, {
          role: 'user' as const,
          content: `Your previous response had issues: ${validation.errors.join(', ')}. Please correct and respond again.`,
        }];
        const retryRequest = { ...providerRequest, messages: correctedMessages };
        const retryResult = await this.retryManager.withRetry(provider.name, () => provider.call(retryRequest), { maxRetries: 1 });
        providerResponse = retryResult.result;
        retries += retryResult.retries + 1;
      } catch { /* use original response */ }
    }

    // ── Step 11: Cache Store ─────────────────────────────────────────────────
    if (validation.valid) {
      this.cache.set(ctxTask, providerResponse.content, {
        provider: provider.name, model: providerResponse.model,
        tokensIn: providerResponse.tokensIn, tokensOut: providerResponse.tokensOut, costUsd: providerResponse.costUsd,
      });
    }

    // ── Step 12: Record Budget & Monitoring ───────────────────────────────────
    if (ctxTask.userId) this.budgetManager.recordSpend(ctxTask.userId, providerResponse.costUsd);

    this.monitoring.record({
      provider: provider.name,
      latencyMs: providerResponse.latencyMs,
      costUsd: providerResponse.costUsd,
      tokensIn: providerResponse.tokensIn,
      tokensOut: providerResponse.tokensOut,
      success: validation.valid,
      cacheHit: false,
      validationPassed: validation.valid,
    });

    // ── Step 13: Learning Engine ─────────────────────────────────────────────
    this.learning.record({
      taskType: ctxTask.type,
      provider: provider.name,
      model: providerResponse.model,
      tokensIn: providerResponse.tokensIn,
      tokensOut: providerResponse.tokensOut,
      costUsd: providerResponse.costUsd,
      latencyMs: providerResponse.latencyMs,
      retries,
      cacheHit: false,
      validationPassed: validation.valid,
    });

    return {
      content: providerResponse.content,
      provider: provider.name,
      model: providerResponse.model,
      tokensIn: providerResponse.tokensIn,
      tokensOut: providerResponse.tokensOut,
      costUsd: providerResponse.costUsd,
      latencyMs: providerResponse.latencyMs,
      cached: false,
      validated: validation.valid,
      retries,
      validationWarnings: [...validation.warnings, ...validation.errors],
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildMessages(systemPrompt: string, userPrompt: string, images?: string[]): ProviderMessage[] {
    const messages: ProviderMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

    if (images && images.length > 0) {
      const content = [
        { type: 'text' as const, text: userPrompt },
        ...images.map(url => ({ type: 'image_url' as const, image_url: { url } })),
      ];
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: userPrompt });
    }
    return messages;
  }

  private async failover(request: ProviderRequest, failedProvider: string): Promise<any> {
    const alternatives = this.providerFactory.getUniqueAvailable().filter(p => p.name !== failedProvider);
    for (const alt of alternatives) {
      try {
        this.logger.warn(`Failover: trying ${alt.name} after ${failedProvider} failed`);
        return await alt.call(request);
      } catch { continue; }
    }
    return this.providerFactory.get('mock').call(request);
  }
}
