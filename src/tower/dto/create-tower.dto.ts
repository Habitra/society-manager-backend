// src/tower/dto/create-tower.dto.ts
// ============================================================
// DTO for creating a new tower within a community.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTowerDto {
  @ApiProperty({ description: 'Tower / block display name', example: 'Tower A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Short code (unique within community)', example: 'A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'code must be alphanumeric (hyphens and underscores allowed)',
  })
  code!: string;

  @ApiPropertyOptional({ description: 'Number of floors', minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  totalFloors?: number;

  @ApiPropertyOptional({ description: 'Total units in this tower', minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalUnits?: number;

  @ApiPropertyOptional({
    description: 'List of amenities for this tower',
    type: [String],
    example: ['Gym', 'Swimming Pool'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  amenities?: string[];
}
