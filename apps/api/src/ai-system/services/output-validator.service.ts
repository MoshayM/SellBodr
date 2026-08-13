import { Injectable, Logger } from '@nestjs/common';
import { ValidationResult } from '../types';

@Injectable()
export class OutputValidatorService {
  private readonly logger = new Logger('OutputValidatorService');

  validate(content: string, requireJson: boolean, taskType: string): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let score = 100;

    if (!content || content.trim().length === 0) {
      errors.push('Empty response from provider');
      return { valid: false, warnings, errors, score: 0 };
    }

    // JSON validation
    if (requireJson) {
      const parsed = this.tryParseJson(content);
      if (!parsed) {
        errors.push('Response is not valid JSON');
        score -= 50;
      } else {
        // Check for hallucination markers
        if (this.hasHallucinationMarkers(content)) {
          warnings.push('Response may contain hallucinated data');
          score -= 20;
        }
      }
    }

    // Length sanity check
    if (content.length < 5) {
      errors.push('Response suspiciously short');
      score -= 30;
    }

    // Detect refusals
    if (this.isRefusal(content)) {
      errors.push('Provider refused the request');
      score -= 80;
    }

    // Task-specific validation
    const taskWarnings = this.validateForTask(content, taskType);
    warnings.push(...taskWarnings);
    score -= taskWarnings.length * 5;

    const valid = errors.length === 0;
    if (!valid) {
      this.logger.warn(`Validation failed for task=${taskType}: ${errors.join(', ')}`);
    }

    return { valid, warnings, errors, score: Math.max(0, score) };
  }

  tryParseJson(content: string): unknown | null {
    const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    try { return JSON.parse(cleaned); } catch { return null; }
  }

  extractJson(content: string): string {
    const match = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/\{[\s\S]*\}/);
    return match ? (match[1] ?? match[0]).trim() : content.trim();
  }

  private hasHallucinationMarkers(text: string): boolean {
    const markers = ['as of my knowledge cutoff', 'i don\'t have access', 'i cannot verify', 'i\'m not sure about the exact'];
    return markers.some(m => text.toLowerCase().includes(m));
  }

  private isRefusal(text: string): boolean {
    const refusals = ["i can't help", "i cannot assist", "i'm unable to", "i won't"];
    return refusals.some(r => text.toLowerCase().startsWith(r));
  }

  private validateForTask(content: string, taskType: string): string[] {
    const warnings: string[] = [];
    if (taskType === 'image_validation') {
      const parsed = this.tryParseJson(content) as any;
      if (parsed && typeof parsed.confidence !== 'number') warnings.push('image_validation response missing confidence field');
      if (parsed && typeof parsed.verified !== 'boolean') warnings.push('image_validation response missing verified field');
    }
    if (taskType === 'recommendation') {
      const lower = content.toLowerCase();
      const hasRec = lower.includes('launch') || lower.includes('hold') || lower.includes('reject');
      if (!hasRec) warnings.push('recommendation response missing Launch/Hold/Reject decision');
    }
    return warnings;
  }
}
