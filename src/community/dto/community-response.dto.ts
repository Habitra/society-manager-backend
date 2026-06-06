// src/community/dto/community-response.dto.ts
// ============================================================
// Swagger-documented response shape for Community entities.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityStatus, CommunityType } from '@prisma/client';

export class CommunityAddressDto {
  @ApiProperty() line1!: string;
  @ApiPropertyOptional() line2?: string;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiProperty() pincode!: string;
  @ApiProperty() country!: string;
}

export class CommunityGeoDto {
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
}

export class CommunityResponseDto {
  @ApiProperty({ description: 'UUID' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: CommunityType }) type!: CommunityType;
  @ApiProperty({ enum: CommunityStatus }) status!: CommunityStatus;
  @ApiPropertyOptional() logoUrl?: string | null;
  @ApiProperty({ type: CommunityAddressDto }) address!: CommunityAddressDto;
  @ApiPropertyOptional({ type: CommunityGeoDto }) geoLocation?: CommunityGeoDto | null;
  @ApiProperty() contactEmail!: string;
  @ApiProperty() contactPhone!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() totalUnits!: number;
  @ApiProperty() settings!: Record<string, unknown>;
  @ApiProperty() metadata!: Record<string, unknown>;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}
