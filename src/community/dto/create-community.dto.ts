// src/community/dto/create-community.dto.ts
// ============================================================
// DTO for creating a new community (tenant root record).
// Only SUPER_ADMIN can invoke this endpoint.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @ApiProperty({ description: 'Street line 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional({ description: 'Street line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ description: 'State / province' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ description: 'Postal / PIN code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  pincode!: string;

  @ApiProperty({ description: 'Country', default: 'India' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;
}

export class GeoLocationDto {
  @ApiProperty({ description: 'Latitude' })
  lat!: number;

  @ApiProperty({ description: 'Longitude' })
  lng!: number;
}

export class CreateCommunityDto {
  @ApiProperty({ description: 'Community display name', example: 'Green Park Phase 2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'URL-safe slug (auto-generated if not provided)',
    example: 'greenpark-phase2',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens only' })
  slug?: string;

  @ApiProperty({ enum: CommunityType, description: 'Community type' })
  @IsEnum(CommunityType)
  type!: CommunityType;

  @ApiProperty({ description: 'Physical address of the community' })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiPropertyOptional({ description: 'Geo-coordinates' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoLocationDto)
  geoLocation?: GeoLocationDto;

  @ApiProperty({ description: 'Primary contact email', example: 'admin@greenpark.in' })
  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @ApiProperty({ description: 'Primary contact phone', example: '+91-9876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone!: string;

  @ApiPropertyOptional({ description: 'Timezone', default: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Currency ISO code', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Feature flags / config (JSON)', example: '{}' })
  @IsOptional()
  @IsJSON()
  settings?: string;
}
