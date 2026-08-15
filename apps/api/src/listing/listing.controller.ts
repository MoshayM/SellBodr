import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ListingService } from './listing.service';

@ApiTags('Listing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ListingController {
  constructor(private readonly svc: ListingService) {}

  @Get('opportunities/:id/listing')
  getListing(@Request() req: any, @Param('id') id: string) {
    return this.svc.getListing(id, req.user.sub);
  }

  @Post('opportunities/:id/launch-assets')
  generateAssets(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateLaunchAssets(id, req.user.sub);
  }

  @Get('opportunities/:id/keywords')
  getKeywords(@Param('id') id: string) {
    return this.svc.getKeywords(id);
  }

  @Get('opportunities/:id/competitors')
  getCompetitors(@Request() req: any, @Param('id') id: string) {
    return this.svc.getCompetitors(id, req.user.sub);
  }

  @Get('opportunities/:id/review-insights')
  getReviewInsights(@Request() req: any, @Param('id') id: string) {
    return this.svc.getReviewInsights(id, req.user.sub);
  }

  @Post('opportunities/:id/ads')
  generateAds(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateAds(id, req.user.sub);
  }

  @Post('opportunities/:id/growth')
  generateGrowth(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateGrowth(id, req.user.sub);
  }
}
