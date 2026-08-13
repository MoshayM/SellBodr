import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProfitabilityService } from './profitability.service';

@ApiTags('Profitability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProfitabilityController {
  constructor(private readonly svc: ProfitabilityService) {}

  @Get('opportunities/:id/profit')
  getProfit(@Request() req: any, @Param('id') id: string) {
    return this.svc.getProfit(id, req.user.sub);
  }

  @Post('opportunities/:id/profit/recalculate')
  recalculate(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.recalculate(id, req.user.sub, body);
  }
}
