// src/unit/dto/unit-response.dto.ts
// ============================================================
// Swagger-documented response shape for Unit entities.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOccupancyType, UnitType } from '@prisma/client';
import { TowerResponseDto } from '../../tower/dto/tower-response.dto';

export class UnitResponseDto {
  @ApiProperty({ description: 'UUID' }) id!: string;
  @ApiProperty() communityId!: string;
  @ApiPropertyOptional() towerId?: string | null;
  @ApiProperty() unitNumber!: string;
  @ApiPropertyOptional() floor?: number | null;
  @ApiProperty({ enum: UnitType }) type!: UnitType;
  @ApiProperty({ enum: UnitOccupancyType }) occupancy!: UnitOccupancyType;
  @ApiPropertyOptional() areaSqFt?: number | null;
  @ApiPropertyOptional() bedrooms?: number | null;
  @ApiPropertyOptional() bathrooms?: number | null;
  @ApiProperty() isCommercial!: boolean;
  @ApiProperty() metadata!: Record<string, unknown>;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;

  @ApiPropertyOptional({ type: () => TowerResponseDto })
  tower?: TowerResponseDto | null;
}
