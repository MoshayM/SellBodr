import { Injectable, Logger, Optional } from '@nestjs/common';
import { AiOrchestratorService } from '../ai-system/orchestrator/ai.orchestrator.service';
import { ImageValidatorService } from '../ai-system/validators/image.validator';
import { ImageValidationOutput } from '../ai-system/types';

@Injectable()
export class AiImageValidationService {
  private readonly logger = new Logger('AiImageValidationService');

  constructor(
    @Optional() private readonly orchestrator: AiOrchestratorService,
    @Optional() private readonly imageValidator: ImageValidatorService,
  ) {}

  async validate(params: {
    title: string;
    imageUrl: string;
    category?: string;
  }): Promise<{ confidence: number; verified: boolean; source: string; reason: string }> {
    const PLACEHOLDER_PATTERNS = ['picsum.photos', 'lorempixel.com', 'placehold.it', 'placeholder.com'];

    if (PLACEHOLDER_PATTERNS.some(p => params.imageUrl.includes(p))) {
      this.logger.warn(`Rejected placeholder image for "${params.title}"`);
      return { confidence: 0, verified: false, source: 'placeholder', reason: 'Placeholder image rejected' };
    }

    if (!this.orchestrator || !this.imageValidator) {
      this.logger.warn('AI validation services not available — skipping');
      return { confidence: 0, verified: false, source: 'unavailable', reason: 'AI validation not configured' };
    }

    try {
      const prompt = this.imageValidator.buildValidationPrompt({
        title: params.title,
        imageUrl: params.imageUrl,
        category: params.category,
      });

      const aiResult = await this.orchestrator.run({
        type: 'image_validation',
        prompt,
        images: [params.imageUrl],
        requireVision: true,
        requireJson: true,
        maxTokens: 250,
        budgetUsd: 0.01,
      });

      const parsed: ImageValidationOutput = this.imageValidator.parseAiResponse(
        aiResult.content,
        { title: params.title, imageUrl: params.imageUrl, category: params.category },
      );

      const reason = parsed.rejectionReason
        ?? (parsed.verified
          ? `AI verified: image matches product (${parsed.confidence}%)`
          : `AI confidence: ${parsed.confidence}%`);

      this.logger.log(
        `[AI Validation] "${params.title}" | confidence=${parsed.confidence} verified=${parsed.verified} | ${reason}`,
      );

      return {
        confidence: parsed.confidence,
        verified: parsed.verified,
        source: `ai:${aiResult.provider}`,
        reason,
      };
    } catch (err: any) {
      this.logger.error(`AI image validation error for "${params.title}": ${err.message}`);
      return { confidence: 0, verified: false, source: 'error', reason: `Validation error: ${err.message}` };
    }
  }
}
