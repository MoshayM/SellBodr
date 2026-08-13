import { Module } from '@nestjs/common';
import { OpportunityController } from './opportunity.controller';
import { OpportunityService } from './opportunity.service';
import { ScoringService } from './scoring.service';
import { ProductNormalizerService } from './product-normalizer.service';
import { ImageValidationService } from './image-validation.service';
import { AiImageValidationService } from './ai-image-validation.service';
import { AiSystemModule } from '../ai-system/ai-system.module';

@Module({
  imports: [AiSystemModule],
  controllers: [OpportunityController],
  providers: [OpportunityService, ScoringService, ProductNormalizerService, ImageValidationService, AiImageValidationService],
  exports: [OpportunityService],
})
export class OpportunityModule {}
