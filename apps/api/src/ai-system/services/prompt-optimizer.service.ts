import { Injectable, Logger } from '@nestjs/common';
import { AiTask } from '../types';
import { TokenManagerService } from './token-manager.service';

// Fields safe to drop when context becomes too large
const DROPPABLE_CONTEXT_KEYS = [
  'launchAsset', 'reports', 'agentRuns', 'auditLogs',
  'description', 'bundleSuggestions', 'brandConcepts',
];

@Injectable()
export class PromptOptimizerService {
  private readonly logger = new Logger('PromptOptimizerService');

  constructor(private readonly tokenManager: TokenManagerService) {}

  optimize(task: AiTask, maxInputTokens: number): { prompt: string; systemPrompt: string } {
    let prompt = this.tokenManager.compress(task.prompt);
    let system = this.tokenManager.compress(task.systemPrompt ?? this.defaultSystemPrompt(task.type));

    // If context object exists, serialize only required fields
    if (task.context && Object.keys(task.context).length > 0) {
      const ctx = this.filterContext(task.context, task.type);
      const ctxStr = JSON.stringify(ctx, null, 0); // compact JSON
      prompt = `${prompt}\n\nContext:\n${ctxStr}`;
    }

    // Enforce token budget — truncate prompt (not system) if oversized
    const systemTokens = Math.ceil(system.length / 4);
    const remainingForPrompt = maxInputTokens - systemTokens - 50; // 50 token buffer
    if (remainingForPrompt > 0) {
      prompt = this.tokenManager.truncate(prompt, remainingForPrompt);
    }

    return { prompt, systemPrompt: system };
  }

  private filterContext(ctx: Record<string, unknown>, taskType: string): Record<string, unknown> {
    const required = this.requiredContextKeys(taskType);
    const filtered: Record<string, unknown> = {};

    for (const key of required) {
      if (key in ctx) filtered[key] = ctx[key];
    }

    // Drop droppable keys
    for (const key of DROPPABLE_CONTEXT_KEYS) {
      delete filtered[key];
    }

    return filtered;
  }

  private requiredContextKeys(taskType: string): string[] {
    const map: Record<string, string[]> = {
      trend_analysis:       ['product', 'marketplace', 'historicalMetrics'],
      competitor_analysis:  ['product', 'marketplace', 'competitors'],
      supplier_search:      ['product', 'category'],
      seo:                  ['product', 'marketplace', 'keywords'],
      listing_optimization: ['product', 'marketplace', 'profitModel'],
      image_validation:     ['product', 'imageUrl', 'category'],
      profitability:        ['product', 'marketplace', 'profitModel'],
      recommendation:       ['product', 'marketplace', 'score', 'profitModel'],
      report_generation:    ['product', 'marketplace', 'score', 'profitModel', 'sourcing'],
    };
    return map[taskType] ?? Object.keys({});
  }

  private defaultSystemPrompt(taskType: string): string {
    const prompts: Record<string, string> = {
      image_validation:     'You are a product image validator. Analyze whether the image matches the product title. Return JSON with confidence (0-100), verified (bool), detectedObjects (array), and rejectionReason (string or null).',
      listing_optimization: 'You are an Amazon listing expert. Generate SEO-optimized product listings for Indian handmade products targeting international buyers. Be specific, use keywords naturally, avoid generic phrases.',
      trend_analysis:       'You are a market trend analyst for cross-border eCommerce. Provide data-driven insights with confidence scores.',
      recommendation:       'You are a cross-border eCommerce advisor. Provide a Launch/Hold/Reject recommendation with detailed justification and confidence percentage.',
      report_generation:    'You are a professional eCommerce analyst. Generate a comprehensive, structured report. Include executive summary, opportunity analysis, risks, and action plan.',
    };
    return prompts[taskType] ?? 'You are an expert AI assistant for cross-border eCommerce intelligence. Be concise, accurate, and return structured data.';
  }
}
