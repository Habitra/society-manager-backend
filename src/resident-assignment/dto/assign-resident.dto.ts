// src/resident-assignment/dto/assign-resident.dto.ts
// ============================================================
// DTO for assigning a resident to a unit.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OccupancyType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignResidentDto {
  @ApiProperty({ description: 'User ID to assign', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Unit ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ enum: OccupancyType, description: 'Occupancy type (OWNER_RESIDENT/OWNER_NON_RESIDENT/TENANT)' })
  @IsEnum(OccupancyType)
  occupancyType!: OccupancyType;

  @ApiPropertyOptional({ description: 'Is this the primary resident for the unit?', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Move in date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  moveInDate?: Date;

  @ApiPropertyOptional({ description: 'Lease end date (for tenants)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  leaseEndDate?: Date;
}
