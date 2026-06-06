// src/tower/dto/tower-response.dto.ts
// ============================================================
// Swagger-documented response shape for Tower entities.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TowerResponseDto {
  @ApiProperty({ description: 'UUID' }) id!: string;
  @ApiProperty() communityId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty() totalFloors!: number;
  @ApiProperty() totalUnits!: number;
  @ApiProperty({ type: [String] }) amenities!: string[];
  @ApiProperty() metadata!: Record<string, unknown>;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}
