import { Injectable } from '@nestjs/common';
import { AiTask, TaskComplexity, TaskRequirements, TaskType } from '../types';

// Per-task default requirements
const TASK_PROFILES: Record<TaskType, Partial<TaskRequirements>> = {
  product_research:    { complexity: 'complex',  requireVision: false, requireJson: true,  estimatedInputTokens: 800,  estimatedOutputTokens: 600,  maxLatencyMs: 10000, maxCostUsd: 0.05 },
  trend_analysis:      { complexity: 'moderate', requireVision: false, requireJson: true,  estimatedInputTokens: 600,  estimatedOutputTokens: 400,  maxLatencyMs: 8000,  maxCostUsd: 0.03 },
  competitor_analysis: { complexity: 'complex',  requireVision: false, requireJson: true,  estimatedInputTokens: 1000, estimatedOutputTokens: 800,  maxLatencyMs: 12000, maxCostUsd: 0.08 },
  supplier_search:     { complexity: 'moderate', requireVision: false, requireJson: true,  estimatedInputTokens: 500,  estimatedOutputTokens: 400,  maxLatencyMs: 8000,  maxCostUsd: 0.03 },
  seo:                 { complexity: 'moderate', requireVision: false, requireJson: true,  estimatedInputTokens: 600,  estimatedOutputTokens: 500,  maxLatencyMs: 8000,  maxCostUsd: 0.04 },
  listing_optimization:{ complexity: 'moderate', requireVision: false, requireJson: false, estimatedInputTokens: 700,  estimatedOutputTokens: 600,  maxLatencyMs: 10000, maxCostUsd: 0.04 },
  image_validation:    { complexity: 'simple',   requireVision: true,  requireJson: true,  estimatedInputTokens: 400,  estimatedOutputTokens: 200,  maxLatencyMs: 5000,  maxCostUsd: 0.02 },
  demand_prediction:   { complexity: 'complex',  requireVision: false, requireJson: true,  estimatedInputTokens: 800,  estimatedOutputTokens: 400,  maxLatencyMs: 10000, maxCostUsd: 0.05 },
  profitability:       { complexity: 'moderate', requireVision: false, requireJson: true,  estimatedInputTokens: 600,  estimatedOutputTokens: 400,  maxLatencyMs: 8000,  maxCostUsd: 0.03 },
  recommendation:      { complexity: 'expert',   requireVision: false, requireJson: true,  estimatedInputTokens: 1200, estimatedOutputTokens: 600,  maxLatencyMs: 15000, maxCostUsd: 0.10 },
  report_generation:   { complexity: 'expert',   requireVision: false, requireJson: false, estimatedInputTokens: 2000, estimatedOutputTokens: 2000, maxLatencyMs: 30000, maxCostUsd: 0.20 },
  chat:                { complexity: 'simple',   requireVision: false, requireJson: false, estimatedInputTokens: 400,  estimatedOutputTokens: 300,  maxLatencyMs: 5000,  maxCostUsd: 0.01 },
  summarization:       { complexity: 'simple',   requireVision: false, requireJson: false, estimatedInputTokens: 1000, estimatedOutputTokens: 300,  maxLatencyMs: 5000,  maxCostUsd: 0.02 },
  vision:              { complexity: 'moderate', requireVision: true,  requireJson: true,  estimatedInputTokens: 600,  estimatedOutputTokens: 300,  maxLatencyMs: 8000,  maxCostUsd: 0.04 },
  ocr:                 { complexity: 'simple',   requireVision: true,  requireJson: false, estimatedInputTokens: 400,  estimatedOutputTokens: 200,  maxLatencyMs: 5000,  maxCostUsd: 0.02 },
  translation:         { complexity: 'simple',   requireVision: false, requireJson: false, estimatedInputTokens: 500,  estimatedOutputTokens: 500,  maxLatencyMs: 5000,  maxCostUsd: 0.02 },
  coding:              { complexity: 'complex',  requireVision: false, requireJson: false, estimatedInputTokens: 800,  estimatedOutputTokens: 1000, maxLatencyMs: 15000, maxCostUsd: 0.08 },
};

@Injectable()
export class TaskAnalyzerService {
  analyze(task: AiTask): TaskRequirements {
    const profile = TASK_PROFILES[task.type] ?? {};
    const actualInputTokens = Math.ceil(task.prompt.length / 4) + (task.systemPrompt ? Math.ceil(task.systemPrompt.length / 4) : 0);

    return {
      complexity: profile.complexity ?? 'moderate',
      requireVision:         task.requireVision ?? profile.requireVision ?? false,
      requireJson:           task.requireJson   ?? profile.requireJson   ?? false,
      requireStreaming:      task.stream        ?? false,
      requireFunctionCalling: false,
      estimatedInputTokens:  Math.max(actualInputTokens, profile.estimatedInputTokens ?? 400),
      estimatedOutputTokens: profile.estimatedOutputTokens ?? 300,
      maxLatencyMs:          profile.maxLatencyMs ?? 10000,
      maxCostUsd:            task.budgetUsd ?? profile.maxCostUsd ?? 0.10,
      allowedProviders:      task.context?.allowedProviders as string[] | undefined,
    };
  }

  complexityScore(c: TaskComplexity): number {
    return { simple: 1, moderate: 2, complex: 3, expert: 4 }[c] ?? 2;
  }
}
