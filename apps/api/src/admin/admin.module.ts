import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AiSystemModule } from '../ai-system/ai-system.module';

@Module({
  imports: [AiSystemModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
