// src/community/dto/update-community.dto.ts
// ============================================================
// DTO for updating an existing community.
// Extends CreateCommunityDto with all fields optional.
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateCommunityDto } from './create-community.dto';

export class UpdateCommunityDto extends PartialType(CreateCommunityDto) {
  @ApiPropertyOptional({ enum: CommunityStatus, description: 'Community lifecycle status' })
  @IsOptional()
  @IsEnum(CommunityStatus)
  status?: CommunityStatus;
}
