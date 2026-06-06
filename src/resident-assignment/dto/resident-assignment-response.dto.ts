// src/resident-assignment/dto/resident-assignment-response.dto.ts
// ============================================================
// Response DTO for ResidentUnitAssignment.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOccupancyType } from '@prisma/client';
import { UnitResponseDto } from '../../unit/dto/unit-response.dto';

export class MinimalUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() phone?: string | null;
}

export class ResidentAssignmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() communityId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() unitId!: string;
  @ApiProperty({ enum: UnitOccupancyType }) occupancy!: UnitOccupancyType;
  @ApiProperty() isPrimary!: boolean;
  @ApiPropertyOptional() moveInDate?: Date | null;
  @ApiPropertyOptional() moveOutDate?: Date | null;
  @ApiPropertyOptional() leaseEndDate?: Date | null;
  @ApiProperty() metadata!: Record<string, unknown>;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;

  @ApiPropertyOptional({ type: () => MinimalUserDto })
  user?: MinimalUserDto | null;

  @ApiPropertyOptional({ type: () => UnitResponseDto })
  unit?: UnitResponseDto | null;
}
