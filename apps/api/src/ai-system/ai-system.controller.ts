import { Controller, Get, UseGuards } from '@nestjs/common';
import { MonitoringService } from './services/monitoring.service';
import { LearningEngineService } from './services/learning-engine.service';
import { CacheManagerService } from './services/cache-manager.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('ai-system')
@UseGuards(JwtAuthGuard)
export class AiSystemController {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly learning: LearningEngineService,
    private readonly cache: CacheManagerService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.monitoring.getDashboard();
  }

  @Get('metrics')
  getMetrics() {
    return this.monitoring.getSystemMetrics();
  }

  @Get('provider-health')
  getProviderHealth() {
    return this.monitoring.getProviderHealth();
  }

  @Get('provider-rankings')
  getProviderRankings() {
    return this.learning.getProviderRankings();
  }

  @Get('cache-stats')
  getCacheStats() {
    return this.cache.getStats();
  }
}
