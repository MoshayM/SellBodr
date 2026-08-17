import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma.module';
import { OpportunityModule } from './opportunity/opportunity.module';
import { SourcingModule } from './sourcing/sourcing.module';
import { ProfitabilityModule } from './profitability/profitability.module';
import { ListingModule } from './listing/listing.module';
import { BillingModule } from './billing/billing.module';
import { ReportModule } from './report/report.module';
import { SettingsModule } from './settings/settings.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AiSystemModule } from './ai-system/ai-system.module';
import { AdminModule } from './admin/admin.module';
import { TeamModule } from './team/team.module';
import { CrawlModule } from './crawl/crawl.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AiSystemModule,
    AuthModule,
    OpportunityModule,
    SourcingModule,
    ProfitabilityModule,
    ListingModule,
    BillingModule,
    ReportModule,
    SettingsModule,
    MarketplaceModule,
    AdminModule,
    TeamModule,
    CrawlModule,
  ],
})
export class AppModule {}
