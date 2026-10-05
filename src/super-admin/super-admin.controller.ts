import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminService } from './super-admin.service';
import { CommunityQueryDto } from './dto/community-query.dto';
import { CommunityAdminQueryDto } from './dto/community-admin-query.dto';
import { CreateCommunityAdminDto } from './dto/create-community-admin.dto';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@ApiTags('Super Admin')
@ApiBearerAuth()

@Roles(UserRole.SUPER_ADMIN)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @AuthenticatedOnly()
  @Get('dashboard')
  @ApiOperation({ summary: 'Get global dashboard statistics' })
  async getDashboardStats() {
    return this.superAdminService.getDashboardStats();
  }

  @AuthenticatedOnly()
  @Get('communities')
  @ApiOperation({ summary: 'List all communities globally' })
  async getCommunities(@Query() query: CommunityQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;
    return this.superAdminService.getCommunities(skip, limit, search, status);
  }

  @AuthenticatedOnly()
  @Get('communities/:id')
  @ApiOperation({ summary: 'Get details of a specific community' })
  async getCommunityDetails(@Param('id') id: string) {
    return this.superAdminService.getCommunityDetails(id);
  }

  @AuthenticatedOnly()
  @Get('communities/:id/stats')
  @ApiOperation({ summary: 'Get stats for a specific community' })
  async getCommunityStats(@Param('id') id: string) {
    return this.superAdminService.getCommunityStats(id);
  }

  @AuthenticatedOnly()
  @Patch('communities/:id/activate')
  @ApiOperation({ summary: 'Activate a community' })
  async activateCommunity(@Param('id') id: string, @Request() req: any) {
    return this.superAdminService.activateCommunity(id, req.user.id);
  }

  @AuthenticatedOnly()
  @Patch('communities/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a community' })
  async deactivateCommunity(@Param('id') id: string, @Request() req: any) {
    return this.superAdminService.deactivateCommunity(id, req.user.id);
  }

  @AuthenticatedOnly()
  @Post('community-admins')
  @ApiOperation({ summary: 'Create a new Community Admin' })
  async createCommunityAdmin(@Body() dto: CreateCommunityAdminDto, @Request() req: any) {
    return this.superAdminService.createCommunityAdmin(dto, req.user.id);
  }

  @AuthenticatedOnly()
  @Get('community-admins')
  @ApiOperation({ summary: 'List all community admins globally' })
  async getCommunityAdmins(@Query() query: CommunityAdminQueryDto) {
    const { page = 1, limit = 10, search, communityId } = query;
    const skip = (page - 1) * limit;
    return this.superAdminService.getCommunityAdmins(skip, limit, search, communityId);
  }

  @AuthenticatedOnly()
  @Get('community-admins/:id')
  @ApiOperation({ summary: 'Get details of a specific community admin' })
  async getCommunityAdminDetails(@Param('id') id: string) {
    const admin = await this.superAdminService.getCommunityAdminDetails(id);
    return {
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      email: admin.email,
      phone: admin.phone,
      community: admin.community,
      lastLogin: admin.lastLoginAt,
      status: admin.status,
    };
  }

  @AuthenticatedOnly()
  @Post('community-admins/:id/reset-password')
  @ApiOperation({ summary: 'Reset the password of a community admin' })
  async resetCommunityAdminPassword(@Param('id') id: string, @Request() req: any) {
    return this.superAdminService.resetCommunityAdminPassword(id, req.user.id);
  }

  @AuthenticatedOnly()
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get system-wide audit logs' })
  async getAuditLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 25,
    @Query('search') search?: string,
    @Query('action') action?: string,
  ) {
    const skip = ((page || 1) - 1) * (limit || 25);
    return this.superAdminService.getAuditLogs(skip, limit || 25, search, action);
  }
}
