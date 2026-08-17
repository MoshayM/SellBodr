import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // ── AI Provider Keys ────────────────────────────────────────────────────────

  @Get('ai-provider-keys')
  getAiProviderKeys(@Request() req: any) {
    return this.settings.getAiProviderKeys(req.user.organizationId);
  }

  @Put('ai-provider-keys')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: false, transform: false }))
  updateAiProviderKeys(@Request() req: any, @Body() body: any) {
    return this.settings.updateAiProviderKeys(req.user.organizationId, body as Record<string, string>);
  }

  // ── Personal API Keys ────────────────────────────────────────────────────────

  @Get('api-keys')
  listApiKeys(@Request() req: any) {
    return this.settings.listApiKeys(req.user.sub);
  }

  @Post('api-keys')
  createApiKey(@Request() req: any, @Body() body: { name: string }) {
    return this.settings.createApiKey(req.user.sub, body.name || 'My Key');
  }

  @Delete('api-keys/:id')
  @HttpCode(200)
  deleteApiKey(@Request() req: any, @Param('id') id: string) {
    return this.settings.deleteApiKey(req.user.sub, id);
  }

  @Get('api-keys/:id/usage')
  getApiKeyUsage(@Request() req: any, @Param('id') id: string) {
    return this.settings.getApiKeyUsage(req.user.sub, id);
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.settings.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }
}
