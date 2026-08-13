import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MarketplaceService, CreateMarketplaceDto } from './marketplace.service';

@ApiTags('Marketplaces')
@Controller('marketplaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplaceController {
  constructor(private readonly svc: MarketplaceService) {}

  @Get()
  list(@Query('active') active?: string) { return this.svc.list(active === 'true'); }

  @Post()
  create(@Body() body: CreateMarketplaceDto) { return this.svc.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
