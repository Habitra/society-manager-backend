// src/community/community.service.ts
// ============================================================
// Community service — business logic layer.
//
// SUPER_ADMIN operations:
//   - createCommunity()  → creates new tenant root
//   - updateCommunity()  → global update by id
//   - listCommunities()  → paginated cross-tenant list
//   - getCommunityById() → global fetch
//
// COMMUNITY_ADMIN self-service:
//   - getOwnCommunity()  → fetch current tenant's community
//   - updateOwnCommunity() → update own community settings
// ============================================================

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { toPaginatedResult } from '../common/utils/pagination.util';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { generateSlug } from '../common/utils/slug.util';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CommunityResponseDto } from './dto/community-response.dto';
import { ListCommunitiesDto } from './dto/list-communities.dto';
import { CommunityRepository } from './community.repository';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly auditService: AuditService,
  ) {}

  // ─── SUPER ADMIN: Create ──────────────────────────────────────────────────────

  async createCommunity(
    dto: CreateCommunityDto,
    actorId: string,
  ): Promise<CommunityResponseDto> {
    // Resolve slug
    const slug = dto.slug ?? generateSlug(dto.name);

    // Check slug uniqueness
    const existing = await this.communityRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException(`A community with slug '${slug}' already exists.`);
    }

    const community = await this.communityRepository.createCommunity({
      name: dto.name,
      code: dto.code,
      slug,
      type: dto.type,
      address: dto.address as unknown as object,
      geoLocation: dto.geoLocation ? (dto.geoLocation as unknown as object) : undefined,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      timezone: dto.timezone ?? 'Asia/Kolkata',
      currency: dto.currency ?? 'INR',
      logoUrl: dto.logoUrl,
      settings: dto.settings ? JSON.parse(dto.settings) : {},
    });

    void this.auditService.write({
      communityId: community.id,
      actorId,
      action: AuditAction.CREATE,
      tableName: 'communities',
      recordId: community.id,
      newValues: { name: community.name, slug: community.slug },
    });

    this.logger.log(`Community created: ${community.id} (${community.slug})`);
    return community as unknown as CommunityResponseDto;
  }

  // ─── SUPER ADMIN: Update ──────────────────────────────────────────────────────

  async updateCommunity(
    id: string,
    dto: UpdateCommunityDto,
    actorId: string,
  ): Promise<CommunityResponseDto> {
    const community = await this.communityRepository.findByIdGlobal(id);
    if (!community) {
      throw new NotFoundException(`Community '${id}' not found.`);
    }

    // If slug is changing, check uniqueness
    if (dto.slug && dto.slug !== (community as any).slug) {
      const existing = await this.communityRepository.findBySlug(dto.slug);
      if (existing) {
        throw new ConflictException(`Slug '${dto.slug}' is already taken.`);
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.settings) {
      updateData.settings = JSON.parse(dto.settings as string);
    }
    if (dto.address) {
      updateData.address = dto.address as unknown as object;
    }
    if (dto.geoLocation) {
      updateData.geoLocation = dto.geoLocation as unknown as object;
    }

    const updated = await this.communityRepository.updateCommunity(id, updateData as any);

    void this.auditService.write({
      communityId: id,
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'communities',
      recordId: id,
      newValues: updateData as Record<string, unknown>,
    });

    return updated as unknown as CommunityResponseDto;
  }

  // ─── SUPER ADMIN: List ────────────────────────────────────────────────────────

  async listCommunities(
    dto: ListCommunitiesDto,
  ): Promise<PaginatedResult<CommunityResponseDto>> {
    const { items, total } = await this.communityRepository.findAllPaginated(dto);
    return toPaginatedResult(
      items as unknown as CommunityResponseDto[],
      total,
      dto,
    );
  }

  // ─── SUPER ADMIN / COMMUNITY_ADMIN: Get by ID ─────────────────────────────────

  async getCommunityById(id: string): Promise<CommunityResponseDto> {
    const community = await this.communityRepository.findByIdGlobal(id);
    if (!community) {
      throw new NotFoundException(`Community '${id}' not found.`);
    }
    return community as unknown as CommunityResponseDto;
  }

  // ─── COMMUNITY_ADMIN: Self-service ────────────────────────────────────────────

  async getOwnCommunity(): Promise<CommunityResponseDto> {
    const community = await this.communityRepository.getOwnCommunity();
    if (!community) {
      throw new NotFoundException('Community not found.');
    }
    return community as unknown as CommunityResponseDto;
  }

  async updateOwnCommunity(
    dto: UpdateCommunityDto,
    actorId: string,
    communityId: string,
  ): Promise<CommunityResponseDto> {
    return this.updateCommunity(communityId, dto, actorId);
  }

  // ─── SUPER ADMIN: Delete ──────────────────────────────────────────────────────

  async deleteCommunity(id: string, actorId: string): Promise<void> {
    const community = await this.communityRepository.findByIdGlobal(id);
    if (!community) {
      throw new NotFoundException(`Community '${id}' not found.`);
    }

    await this.communityRepository.updateCommunity(id, { deletedAt: new Date() } as any);

    void this.auditService.write({
      communityId: id,
      actorId,
      action: AuditAction.SOFT_DELETE,
      tableName: 'communities',
      recordId: id,
    });
  }
}
