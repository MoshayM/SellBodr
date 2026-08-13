import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { AiSystemModule } from '../ai-system/ai-system.module';

@Module({
  imports: [AiSystemModule],
  controllers: [ListingController],
  providers: [ListingService],
})
export class ListingModule {}
