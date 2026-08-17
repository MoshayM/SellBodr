import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { OpportunityService } from '../opportunity/opportunity.service';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class CrawlService {
  private readonly logger = new Logger('CrawlService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly opportunity: OpportunityService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async rescoreStaleOpportunities() {
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

    const stale = await this.prisma.opportunity.findMany({
      where: { updatedAt: { lt: staleThreshold }, status: 'scored' },
      include: { search: true },
      take: 10, // process 10 at a time to avoid overload
    });

    if (stale.length === 0) return;

    this.logger.log(`CrawlService: rescoring ${stale.length} stale opportunities`);

    for (const opp of stale) {
      try {
        await this.opportunity.rescoreOpportunity(opp.id, opp.search.userId);
      } catch (err) {
        this.logger.error(`Failed to rescore opportunity ${opp.id}:`, err);
      }
    }
  }
}
