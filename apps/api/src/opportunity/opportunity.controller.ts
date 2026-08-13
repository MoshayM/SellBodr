import { Controller, Get, Post, Param, Query, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OpportunityService } from './opportunity.service';

@ApiTags('Opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OpportunityController {
  constructor(private readonly svc: OpportunityService) {}

  @Post('searches')
  createSearch(@Request() req: any, @Body() body: any) {
    return this.svc.createSearch(req.user.sub, req.user.organizationId, body);
  }

  @Get('searches')
  listSearches(@Request() req: any) {
    return this.svc.listSearches(req.user.sub);
  }

  @Get('searches/:id')
  getSearch(@Request() req: any, @Param('id') id: string) {
    return this.svc.getSearch(id, req.user.sub);
  }

  @Get('opportunities')
  listOpportunities(@Request() req: any, @Query() query: any) {
    return this.svc.listOpportunities(req.user.sub, query);
  }

  @Get('opportunities/:id')
  getOpportunity(@Request() req: any, @Param('id') id: string) {
    return this.svc.getOpportunity(id, req.user.sub);
  }

  @Post('opportunities/:id/refresh')
  @HttpCode(202)
  refreshOpportunity(@Param('id') id: string) {
    return { message: 'Re-scoring queued', opportunityId: id };
  }
}
