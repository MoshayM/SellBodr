import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string; name: string; orgName: string }) {
    return this.auth.register(body.email, body.password, body.name, body.orgName);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string; mfaCode?: string }) {
    return this.auth.login(body.email, body.password, body.mfaCode);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() body: { refreshToken: string }) {
    return this.auth.logout(body.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Post('mfa/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  enrollMfa(@Request() req: any) {
    return this.auth.enrollMfa(req.user.sub);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyMfa(@Request() req: any, @Body() body: { code: string }) {
    return this.auth.verifyMfa(req.user.sub, body.code);
  }
}
