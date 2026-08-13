import { Injectable } from '@nestjs/common';
import { AiTask, TaskType } from '../types';

// Fields needed per task type — prevents sending irrelevant data
const CONTEXT_MAP: Record<TaskType, string[]> = {
  product_research:    ['product', 'marketplace', 'category'],
  trend_analysis:      ['product', 'marketplace', 'historicalMetrics', 'category'],
  competitor_analysis: ['product', 'marketplace', 'competitors'],
  supplier_search:     ['product', 'category', 'sourcing'],
  seo:                 ['product', 'marketplace', 'keywords', 'category'],
  listing_optimization:['product', 'marketplace', 'profitModel', 'keywords'],
  image_validation:    ['product', 'imageUrl', 'category', 'marketplace'],
  demand_prediction:   ['product', 'marketplace', 'historicalMetrics'],
  profitability:       ['product', 'marketplace', 'profitModel'],
  recommendation:      ['product', 'marketplace', 'score', 'profitModel'],
  report_generation:   ['product', 'marketplace', 'score', 'profitModel', 'sourcing', 'competitors'],
  chat:                ['userMessage', 'conversationHistory'],
  summarization:       ['text'],
  vision:              ['imageUrl', 'product'],
  ocr:                 ['imageUrl'],
  translation:         ['text', 'targetLanguage'],
  coding:              ['code', 'language', 'task'],
};

@Injectable()
export class ContextOptimizerService {
  optimize(task: AiTask): AiTask {
    if (!task.context || Object.keys(task.context).length === 0) return task;

    const allowedKeys = CONTEXT_MAP[task.type] ?? [];
    const optimizedCtx: Record<string, unknown> = {};

    for (const key of allowedKeys) {
      if (key in task.context) {
        optimizedCtx[key] = this.stripNulls(task.context[key]);
      }
    }

    return { ...task, context: optimizedCtx };
  }

  private stripNulls(value: unknown): unknown {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(v => this.stripNulls(v)).filter(v => v !== undefined);
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const stripped = this.stripNulls(v);
      if (stripped !== undefined) result[k] = stripped;
    }
    return result;
  }
}
