import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlService } from './crawl.service';
import { OpportunityModule } from '../opportunity/opportunity.module';

@Module({
  imports: [ScheduleModule.forRoot(), OpportunityModule],
  providers: [CrawlService],
})
export class CrawlModule {}
