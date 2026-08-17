import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TeamService } from './team.service';

@ApiTags('Team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('members')
  listMembers(@Request() req: any) {
    return this.team.listMembers(req.user.organizationId);
  }

  @Post('invite')
  invite(@Request() req: any, @Body() body: { email: string; role: string }) {
    return this.team.invite(req.user.organizationId, req.user.sub, body.email, body.role);
  }

  @Delete('members/:userId')
  removeMember(@Request() req: any, @Param('userId') userId: string) {
    return this.team.removeMember(req.user.organizationId, req.user.sub, userId);
  }

  @Patch('members/:userId')
  updateMemberRole(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.team.updateMemberRole(req.user.organizationId, req.user.sub, userId, body.role);
  }

  @Get('invites')
  listInvites(@Request() req: any) {
    return this.team.listInvites(req.user.organizationId);
  }

  @Delete('invites/:inviteId')
  cancelInvite(@Request() req: any, @Param('inviteId') inviteId: string) {
    return this.team.cancelInvite(req.user.organizationId, req.user.sub, inviteId);
  }
}
