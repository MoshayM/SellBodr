import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name: string, orgName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const org = await this.prisma.organization.create({
      data: { name: orgName, plan: 'starter' },
    });

    await this.prisma.subscription.create({
      data: { organizationId: org.id, plan: 'starter', status: 'active' },
    });

    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { organizationId: org.id, email, passwordHash, name, role: 'owner' },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorUserId: user.id,
        action: 'auth.register',
        resourceType: 'user',
        resourceId: user.id,
      },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.organizationId);
    return { ...tokens, user: this.sanitize(user) };
  }

  async login(email: string, password: string, mfaCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.mfaEnabled) {
      if (!mfaCode) throw new UnauthorizedException('MFA code required');
      if (!user.mfaSecret) throw new UnauthorizedException('MFA not configured');
      const ok = authenticator.verify({ token: mfaCode, secret: user.mfaSecret });
      if (!ok) throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: 'auth.login',
        resourceType: 'user',
        resourceId: user.id,
      },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.organizationId);
    return { ...tokens, user: this.sanitize(user) };
  }

  async refresh(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      if (stored && !stored.revoked) {
        await this.prisma.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revoked: true } });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    return this.issueTokens(user.id, user.role, user.organizationId);
  }

  async logout(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) throw new BadRequestException('No password set on this account');

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');

    const newHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    // revoke all refresh tokens so other sessions must re-login
    await this.prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorUserId: userId,
        action: 'auth.password_changed',
        resourceType: 'user',
        resourceId: userId,
      },
    });

    return { success: true };
  }

  async enrollMfa(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'SellBodr', secret);
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    return { otpauthUrl, secret };
  }

  async verifyMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new BadRequestException('MFA not enrolled');
    const ok = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!ok) throw new UnauthorizedException('Invalid MFA code');
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { enabled: true };
  }

  private async issueTokens(userId: string, role: string, organizationId: string) {
    const payload = { sub: userId, role, organizationId };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-secret',
      expiresIn: '15m',
    });

    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const hash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { userId, tokenHash: hash, expiresAt } });

    return { accessToken, refreshToken: rawRefresh, expiresIn: 900 };
  }

  private sanitize(user: any) {
    const { passwordHash, mfaSecret, ...safe } = user;
    return safe;
  }
}
