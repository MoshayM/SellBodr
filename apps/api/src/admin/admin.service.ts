import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MonitoringService } from '../ai-system/services/monitoring.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monitoring: MonitoringService,
  ) {}

  assertAdmin(user: { role: string }) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true, plan: true } },
        _count: { select: { searches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(
    userId: string,
    actorUserId: string,
    actorOrgId: string,
    changes: { plan?: string; role?: string },
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (changes.role) {
      await this.prisma.user.update({ where: { id: userId }, data: { role: changes.role } });
    }
    if (changes.plan) {
      await this.prisma.organization.update({
        where: { id: user.organizationId },
        data: { plan: changes.plan },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: actorOrgId,
        actorUserId,
        action: 'admin.updateUser',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify(changes),
      },
    });

    return { success: true };
  }

  async getAuditLog(limit: number) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { email: true, name: true } } },
    });
  }

  async getHealth() {
    const [userCount, scansToday, oppCount, agentRunCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.search.count({
        where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
      this.prisma.opportunity.count(),
      this.prisma.agentRun.count({
        where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
    ]);

    let providerHealth: any = {};
    let metrics: any = {};
    try {
      providerHealth = this.monitoring.getProviderHealth();
      metrics = this.monitoring.getSystemMetrics();
    } catch {
      // monitoring may be empty on fresh start
    }

    return {
      status: 'healthy',
      userCount,
      scansToday,
      opportunityCount: oppCount,
      agentRunsToday: agentRunCount,
      providerHealth,
      metrics,
    };
  }

  async getModelRoutes(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { modelRoutes: true },
    });
    return org?.modelRoutes ? JSON.parse(org.modelRoutes) : {};
  }

  async saveModelRoutes(organizationId: string, actorUserId: string, routes: Record<string, string>) {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { modelRoutes: JSON.stringify(routes) },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'admin.saveModelRoutes',
        resourceType: 'organization',
        resourceId: organizationId,
        metadata: JSON.stringify(routes),
      },
    });

    return { success: true };
  }
}
