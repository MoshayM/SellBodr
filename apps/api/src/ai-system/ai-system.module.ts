import { Module } from '@nestjs/common';
import { AiOrchestratorService } from './orchestrator/ai.orchestrator.service';
import { AiSystemController } from './ai-system.controller';

// Services
import { TaskAnalyzerService } from './services/task-analyzer.service';
import { PromptOptimizerService } from './services/prompt-optimizer.service';
import { ContextOptimizerService } from './services/context-optimizer.service';
import { TokenManagerService } from './services/token-manager.service';
import { BudgetManagerService } from './services/budget-manager.service';
import { ProviderSelectorService } from './services/provider-selector.service';
import { OutputValidatorService } from './services/output-validator.service';
import { RetryManagerService } from './services/retry-manager.service';
import { CacheManagerService } from './services/cache-manager.service';
import { MonitoringService } from './services/monitoring.service';
import { LearningEngineService } from './services/learning-engine.service';
import { RateLimitManagerService } from './services/rate-limit-manager.service';

// Providers
import { ProviderFactory } from './providers/provider.factory';

// Validators
import { ProductValidator } from './validators/product.validator';
import { ImageValidatorService } from './validators/image.validator';
import { MarketplaceValidator } from './validators/marketplace.validator';

const SERVICES = [
  TaskAnalyzerService,
  PromptOptimizerService,
  ContextOptimizerService,
  TokenManagerService,
  BudgetManagerService,
  ProviderSelectorService,
  OutputValidatorService,
  RetryManagerService,
  CacheManagerService,
  MonitoringService,
  LearningEngineService,
  RateLimitManagerService,
];

@Module({
  controllers: [AiSystemController],
  providers: [
    ProviderFactory,
    AiOrchestratorService,
    ProductValidator,
    ImageValidatorService,
    MarketplaceValidator,
    ...SERVICES,
  ],
  exports: [
    AiOrchestratorService,
    ProductValidator,
    ImageValidatorService,
    MarketplaceValidator,
    MonitoringService,
    CacheManagerService,
  ],
})
export class AiSystemModule {}
