import { Controller, Get, Patch, Put, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Request() req: any) {
    this.admin.assertAdmin(req.user);
    return this.admin.listUsers();
  }

  @Patch('users')
  updateUser(
    @Request() req: any,
    @Body() body: { userId: string; plan?: string; role?: string },
  ) {
    this.admin.assertAdmin(req.user);
    const { userId, ...changes } = body;
    return this.admin.updateUser(userId, req.user.sub, req.user.organizationId, changes);
  }

  @Get('audit-log')
  getAuditLog(@Request() req: any, @Query('limit') limit = '50') {
    this.admin.assertAdmin(req.user);
    return this.admin.getAuditLog(Math.min(parseInt(limit) || 50, 200));
  }

  @Get('health')
  getHealth(@Request() req: any) {
    this.admin.assertAdmin(req.user);
    return this.admin.getHealth();
  }

  @Get('model-routes')
  getModelRoutes(@Request() req: any) {
    this.admin.assertAdmin(req.user);
    return this.admin.getModelRoutes(req.user.organizationId);
  }

  @Put('model-routes')
  saveModelRoutes(@Request() req: any, @Body() body: Record<string, string>) {
    this.admin.assertAdmin(req.user);
    return this.admin.saveModelRoutes(req.user.organizationId, req.user.sub, body);
  }
}
