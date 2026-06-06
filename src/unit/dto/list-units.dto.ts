// src/unit/dto/list-units.dto.ts
// ============================================================
// Query parameters for listing and searching units.
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOccupancyType, UnitType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListUnitsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by Tower ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  towerId?: string;

  @ApiPropertyOptional({ enum: UnitType, description: 'Filter by unit type' })
  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType;

  @ApiPropertyOptional({ enum: UnitOccupancyType, description: 'Filter by occupancy status' })
  @IsOptional()
  @IsEnum(UnitOccupancyType)
  occupancy?: UnitOccupancyType;
}
