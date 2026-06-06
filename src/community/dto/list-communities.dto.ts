// src/community/dto/list-communities.dto.ts
// ============================================================
// Query params for listing communities (SUPER_ADMIN only).
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityStatus, CommunityType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListCommunitiesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CommunityStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CommunityStatus)
  status?: CommunityStatus;

  @ApiPropertyOptional({ enum: CommunityType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(CommunityType)
  type?: CommunityType;
}
