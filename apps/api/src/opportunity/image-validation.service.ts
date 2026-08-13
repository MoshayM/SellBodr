import { Injectable, Logger, Optional } from '@nestjs/common';
import { AiImageValidationService } from './ai-image-validation.service';

export interface ImageValidationResult {
  confidence: number;
  verified: boolean;
  source: string;
  reason: string;
}

export type ImageConfidenceLabel = 'verified' | 'likely' | 'unverified';

@Injectable()
export class ImageValidationService {
  private readonly logger = new Logger(ImageValidationService.name);

  constructor(
    @Optional() private readonly aiValidator: AiImageValidationService,
  ) {}

  // Synchronous heuristic check (kept for backward compatibility)
  validate(product: {
    title: string;
    imageUrl?: string | null;
    imageSource?: string | null;
    imageConfidence?: number | null;
  }): ImageValidationResult {
    if (!product.imageUrl) {
      return { confidence: 0, verified: false, source: 'none', reason: 'No image URL provided' };
    }

    const placeholderPatterns = ['picsum.photos', 'lorempixel.com', 'placehold.it', 'placeholder.com'];
    if (placeholderPatterns.some(p => product.imageUrl!.includes(p))) {
      this.logger.warn(`Rejected placeholder image for "${product.title}": ${product.imageUrl}`);
      return { confidence: 0, verified: false, source: 'placeholder', reason: 'Placeholder image rejected — not product-specific' };
    }

    return { confidence: 0, verified: false, source: product.imageSource ?? 'unknown', reason: 'Pending AI validation' };
  }

  // Async AI validation — calls Claude Vision to compare image vs product title
  async validateAsync(product: {
    title: string;
    category?: string | null;
    imageUrl?: string | null;
    imageSource?: string | null;
    imageConfidence?: number | null;
  }): Promise<ImageValidationResult> {
    if (!product.imageUrl) {
      return { confidence: 0, verified: false, source: 'none', reason: 'No image URL provided' };
    }

    if (!this.aiValidator) {
      return this.validate(product);
    }

    const result = await this.aiValidator.validate({
      title: product.title,
      imageUrl: product.imageUrl,
      category: product.category ?? undefined,
    });

    this.logResult(product.title, result);
    return result;
  }

  confidenceLabel(confidence: number): ImageConfidenceLabel {
    if (confidence >= 95) return 'verified';
    if (confidence >= 80) return 'likely';
    return 'unverified';
  }

  logResult(title: string, result: ImageValidationResult): void {
    this.logger.log(
      `[ImageValidation] "${title}" | source=${result.source} | confidence=${result.confidence} | verified=${result.verified} | reason=${result.reason}`
    );
  }
}
