// src/community/community.controller.ts
// ============================================================
// Community controller — REST API surface.
//
// Route groups:
//  POST   /communities                → create (SUPER_ADMIN only)
//  GET    /communities                → list all (SUPER_ADMIN only)
//  GET    /communities/me             → own community (COMMUNITY_ADMIN)
//  GET    /communities/:id            → get by ID (SUPER_ADMIN)
//  PATCH  /communities/:id            → update (SUPER_ADMIN)
//  PATCH  /communities/me             → update own (COMMUNITY_ADMIN)
// ============================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CommunityService } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CommunityResponseDto } from './dto/community-response.dto';
import { ListCommunitiesDto } from './dto/list-communities.dto';

@ApiTags('Communities')
@ApiBearerAuth()
@Controller('communities')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ─── SUPER ADMIN: Create ──────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new community (Super Admin only)' })
  @ApiCreatedResponse({ type: CommunityResponseDto })
  @AuditLog({ table: 'communities', captureBody: false })
  async create(
    @Body() dto: CreateCommunityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CommunityResponseDto> {
    return this.communityService.createCommunity(dto, user.id);
  }

  // ─── SUPER ADMIN: List ────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all communities (Super Admin only)' })
  @ApiPaginatedResponse(CommunityResponseDto)
  async findAll(@Query() query: ListCommunitiesDto) {
    return this.communityService.listCommunities(query);
  }

  // ─── COMMUNITY_ADMIN: Own community ──────────────────────────────────────────

  @Get('me')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get the current user's own community details" })
  @ApiOkResponse({ type: CommunityResponseDto })
  async getOwnCommunity(): Promise<CommunityResponseDto> {
    return this.communityService.getOwnCommunity();
  }

  @Patch('me')
  @Roles(UserRole.COMMUNITY_ADMIN)
  @ApiOperation({ summary: "Update the current user's own community" })
  @ApiOkResponse({ type: CommunityResponseDto })
  @AuditLog({ table: 'communities', captureBody: false })
  async updateOwnCommunity(
    @Body() dto: UpdateCommunityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CommunityResponseDto> {
    return this.communityService.updateOwnCommunity(dto, user.id, user.communityId);
  }

  // ─── SUPER ADMIN: By ID ───────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get community by ID (Super Admin only)' })
  @ApiOkResponse({ type: CommunityResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommunityResponseDto> {
    return this.communityService.getCommunityById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a community by ID (Super Admin only)' })
  @ApiOkResponse({ type: CommunityResponseDto })
  @AuditLog({ table: 'communities', captureBody: false })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CommunityResponseDto> {
    return this.communityService.updateCommunity(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a community (soft delete, Super Admin only)' })
  @ApiNoContentResponse()
  @AuditLog({ table: 'communities', captureBody: false })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.communityService.deleteCommunity(id, user.id);
  }
}
