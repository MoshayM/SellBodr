import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ReportService } from './report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReportController {
  constructor(private readonly svc: ReportService) {}

  @Post('opportunities/:id/reports')
  generate(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.generateReport(id, req.user.sub, body.format || 'json');
  }

  @Get('reports/:id')
  getReport(@Param('id') id: string) {
    return this.svc.getReport(id);
  }
}
