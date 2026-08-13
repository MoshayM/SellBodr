import { Injectable, Logger } from '@nestjs/common';
import { ImageValidationInput, ImageValidationOutput } from '../types';

// Category → expected object keywords
const CATEGORY_OBJECTS: Record<string, string[]> = {
  home_office:        ['desk', 'organizer', 'office', 'pen', 'holder', 'wood'],
  wellness:           ['bell', 'bowl', 'incense', 'candle', 'meditation', 'zen'],
  home_decor:         ['decor', 'wall', 'macrame', 'candle', 'vase', 'hanging'],
  travel_accessories: ['wallet', 'passport', 'leather', 'bag', 'card', 'travel'],
  garden:             ['plant', 'planter', 'pot', 'garden', 'flower', 'terracotta'],
  beauty:             ['loofah', 'scrubber', 'soap', 'brush', 'skin', 'natural'],
  fashion:            ['scarf', 'fabric', 'textile', 'cloth', 'print', 'cotton'],
};

// Reject if these are detected (unrelated nature/landscape imagery)
const REJECT_OBJECTS = ['forest', 'mountain', 'grass', 'road', 'highway', 'sky', 'ocean', 'lake', 'river', 'field', 'building', 'car'];

@Injectable()
export class ImageValidatorService {
  private readonly logger = new Logger('ImageValidatorService');

  // Heuristic validation (no AI call) — used for pre-curated images
  validateHeuristic(input: ImageValidationInput, confidence: number): ImageValidationOutput {
    const expectedObjects = this.getExpectedObjects(input.title, input.category);

    if (confidence >= 90) {
      return { confidence, verified: true, expectedObjects, detectedObjects: expectedObjects, source: 'curated' };
    }
    if (confidence >= 80) {
      return { confidence, verified: false, expectedObjects, detectedObjects: expectedObjects, source: 'heuristic' };
    }
    return {
      confidence: 0,
      verified: false,
      expectedObjects,
      detectedObjects: [],
      rejectionReason: `Confidence ${confidence}% below threshold 80%`,
      source: 'heuristic',
    };
  }

  // AI vision validation — returns the parsed result from the AI response
  parseAiResponse(rawResponse: string, input: ImageValidationInput): ImageValidationOutput {
    const expectedObjects = this.getExpectedObjects(input.title, input.category);
    try {
      const cleaned = rawResponse.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);
      const confidence = Number(parsed.confidence ?? 0);
      const detectedObjects = Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : [];
      const hasRejectObject = detectedObjects.some((o: string) => REJECT_OBJECTS.includes(o.toLowerCase()));

      if (hasRejectObject) {
        return {
          confidence: 0,
          verified: false,
          expectedObjects,
          detectedObjects,
          rejectionReason: `Detected unrelated objects: ${detectedObjects.join(', ')}`,
          source: 'ai',
        };
      }

      return { confidence, verified: Boolean(parsed.verified) && confidence >= 80, expectedObjects, detectedObjects, source: 'ai' };
    } catch {
      this.logger.warn('Failed to parse AI image validation response');
      return { confidence: 0, verified: false, expectedObjects, detectedObjects: [], source: 'ai' };
    }
  }

  buildValidationPrompt(input: ImageValidationInput): string {
    const expectedObjects = this.getExpectedObjects(input.title, input.category);
    return `Analyze this product image for: "${input.title}"${input.category ? ` (category: ${input.category})` : ''}.

Expected objects: ${expectedObjects.join(', ')}.
Objects that would REJECT the image: ${REJECT_OBJECTS.join(', ')}.

Return JSON:
{
  "confidence": 0-100,
  "verified": true/false,
  "detectedObjects": ["object1", "object2"],
  "rejectionReason": null or "reason string"
}

Confidence >= 90: verified=true. Confidence 80-89: verified=false. Below 80: reject.`;
  }

  private getExpectedObjects(title: string, category?: string): string[] {
    const words = title.toLowerCase().split(/\s+/);
    const catObjects = CATEGORY_OBJECTS[category ?? ''] ?? [];
    return Array.from(new Set([...words.filter(w => w.length > 3), ...catObjects]));
  }
}
