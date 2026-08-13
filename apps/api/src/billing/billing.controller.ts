import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Get('subscription')
  getSubscription(@Request() req: any) {
    return this.svc.getSubscription(req.user.organizationId);
  }

  @Get('plans')
  getPlans() {
    return this.svc.getPlans();
  }
}
