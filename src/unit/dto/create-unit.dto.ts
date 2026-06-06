// src/unit/dto/create-unit.dto.ts
// ============================================================
// DTO for creating a new unit.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOccupancyType, UnitType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @ApiPropertyOptional({ description: 'Associated tower ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  towerId?: string;

  @ApiProperty({ description: 'Unit number (e.g. 101, A-101)', example: '101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unitNumber!: string;

  @ApiPropertyOptional({ description: 'Floor number', example: 1 })
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ enum: UnitType, default: UnitType.APARTMENT })
  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType;

  @ApiPropertyOptional({ enum: UnitOccupancyType, default: UnitOccupancyType.VACANT })
  @IsOptional()
  @IsEnum(UnitOccupancyType)
  occupancy?: UnitOccupancyType;

  @ApiPropertyOptional({ description: 'Area in square feet', example: 1200.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  areaSqFt?: number;

  @ApiPropertyOptional({ description: 'Number of bedrooms', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ description: 'Number of bathrooms', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'Is commercial unit?', default: false })
  @IsOptional()
  @IsBoolean()
  isCommercial?: boolean;
}
