import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const ROLE_HIERARCHY = ['viewer', 'analyst', 'manager', 'admin'];

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(organizationId: string, invitedById: string, email: string, role: string) {
    if (!ROLE_HIERARCHY.includes(role)) throw new BadRequestException('Invalid role');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.organizationId === organizationId) {
      throw new BadRequestException('User is already a member of this organisation');
    }

    // Cancel any existing pending invite for this email + org
    await this.prisma.teamInvite.deleteMany({
      where: { organizationId, invitedEmail: email, status: 'pending' },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite = await this.prisma.teamInvite.create({
      data: { organizationId, invitedById, invitedEmail: email, role, expiresAt },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: invitedById,
        action: 'team.invite',
        resourceType: 'teamInvite',
        resourceId: invite.id,
        metadata: JSON.stringify({ email, role }),
      },
    });

    return { id: invite.id, email, role, expiresAt, status: 'pending' };
  }

  async removeMember(organizationId: string, actorUserId: string, targetUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId },
    });
    if (!user) throw new NotFoundException('Member not found');

    // Soft-delete by marking deletedAt; they can still log in but will be detached
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'team.removeMember',
        resourceType: 'user',
        resourceId: targetUserId,
      },
    });

    return { success: true };
  }

  async updateMemberRole(organizationId: string, actorUserId: string, targetUserId: string, role: string) {
    if (!ROLE_HIERARCHY.includes(role)) throw new BadRequestException('Invalid role');

    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Member not found');

    await this.prisma.user.update({ where: { id: targetUserId }, data: { role } });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'team.updateRole',
        resourceType: 'user',
        resourceId: targetUserId,
        metadata: JSON.stringify({ role }),
      },
    });

    return { id: targetUserId, role };
  }

  async listInvites(organizationId: string) {
    return this.prisma.teamInvite.findMany({
      where: { organizationId, status: 'pending' },
      include: { invitedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvite(organizationId: string, actorUserId: string, inviteId: string) {
    const invite = await this.prisma.teamInvite.findFirst({
      where: { id: inviteId, organizationId },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    await this.prisma.teamInvite.delete({ where: { id: inviteId } });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'team.cancelInvite',
        resourceType: 'teamInvite',
        resourceId: inviteId,
      },
    });

    return { success: true };
  }
}
