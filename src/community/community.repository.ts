// src/community/community.repository.ts
// ============================================================
// Community repository.
//
// Extends BaseRepository for multi-tenant scoping.
// NOTE: The Community model IS the tenant root — so most Super Admin
// queries bypass TenantContext and use direct Prisma calls.
// Regular tenant-scoped helpers still inherit BaseRepository behaviour.
// ============================================================

import { Injectable } from '@nestjs/common';
import { CommunityStatus, CommunityType, Prisma } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { toPrismaPage } from '../common/utils/pagination.util';
import { ListCommunitiesDto } from './dto/list-communities.dto';

@Injectable()
export class CommunityRepository extends BaseRepository<'community'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'community', tenantContext);
  }

  // ─── Super Admin: cross-tenant queries ──────────────────────────────────────

  /**
   * List ALL communities (no tenant filter).
   * Only callable by SUPER_ADMIN routes.
   */
  async findAllPaginated(
    dto: ListCommunitiesDto,
  ): Promise<{ items: Prisma.CommunityGetPayload<object>[]; total: number }> {
    const { skip, take } = toPrismaPage(dto);

    const where: Prisma.CommunityWhereInput = {
      deletedAt: null,
    };

    if (dto.status) where.status = dto.status as CommunityStatus;
    if (dto.type) where.type = dto.type as CommunityType;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { slug: { contains: dto.search, mode: 'insensitive' } },
        { contactEmail: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.community.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.community.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Find a community by its unique slug (cross-tenant).
   */
  async findBySlug(slug: string): Promise<Prisma.CommunityGetPayload<object> | null> {
    return this.prisma.community.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  /**
   * Find community by ID (cross-tenant — for Super Admin).
   */
  async findByIdGlobal(id: string): Promise<Prisma.CommunityGetPayload<object> | null> {
    return this.prisma.community.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Create a new community (called by SUPER_ADMIN — no tenant context required).
   */
  async createCommunity(
    data: Prisma.CommunityCreateInput,
  ): Promise<Prisma.CommunityGetPayload<object>> {
    return this.prisma.community.create({ data });
  }

  /**
   * Update a community by ID (cross-tenant).
   */
  async updateCommunity(
    id: string,
    data: Prisma.CommunityUpdateInput,
  ): Promise<Prisma.CommunityGetPayload<object>> {
    return this.prisma.community.update({ where: { id }, data });
  }

  // ─── Tenant-scoped helpers (for COMMUNITY_ADMIN self-service) ────────────────

  /**
   * Get the current tenant's own community record.
   */
  async getOwnCommunity(): Promise<Prisma.CommunityGetPayload<object> | null> {
    return this.prisma.community.findFirst({
      where: { id: this.communityId, deletedAt: null },
    });
  }
}
