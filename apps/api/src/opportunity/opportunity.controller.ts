import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
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

  @Post('opportunities/bulk-scan')
  @HttpCode(200)
  bulkScan(@Request() req: any, @Body() body: { keywords: string[]; marketplace: string }) {
    return this.svc.bulkScan(req.user.sub, req.user.organizationId, body.keywords, body.marketplace);
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
  refreshOpportunity(@Request() req: any, @Param('id') id: string) {
    this.svc.rescoreOpportunity(id, req.user.sub).catch(() => {});
    return { message: 'Re-scoring queued', opportunityId: id };
  }

  @Post('opportunities/:id/rescore')
  @HttpCode(200)
  rescoreOpportunity(@Request() req: any, @Param('id') id: string) {
    return this.svc.rescoreOpportunity(id, req.user.sub);
  }

  @Post('opportunities/:id/feedback')
  @HttpCode(200)
  submitFeedback(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { rating: 'up' | 'down'; note?: string },
  ) {
    return this.svc.submitFeedback(id, req.user.sub, req.user.organizationId, body);
  }

  @Get('opportunities/:id/competition')
  getCompetition(@Request() req: any, @Param('id') id: string) {
    return this.svc.getCompetition(id, req.user.sub);
  }

  @Post('opportunities/:id/brand')
  @HttpCode(200)
  generateBrand(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateBrand(id, req.user.sub);
  }

  @Post('opportunities/:id/bundle')
  @HttpCode(200)
  generateBundle(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateBundle(id, req.user.sub);
  }

  @Post('opportunities/:id/reports')
  @HttpCode(200)
  generateReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { format?: string },
  ) {
    return this.svc.createReport(id, req.user.sub, body.format || 'json');
  }
}
