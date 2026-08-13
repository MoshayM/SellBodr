import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SourcingService } from './sourcing.service';

@ApiTags('Sourcing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SourcingController {
  constructor(private readonly svc: SourcingService) {}

  @Get('opportunities/:id/suppliers')
  getSuppliers(@Request() req: any, @Param('id') id: string) {
    return this.svc.getSuppliers(id, req.user.sub);
  }

  @Get('suppliers/:id')
  getSupplier(@Param('id') id: string) {
    return this.svc.getSupplier(id);
  }
}
