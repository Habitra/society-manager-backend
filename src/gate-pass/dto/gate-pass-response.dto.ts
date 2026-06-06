// src/gate-pass/dto/gate-pass-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GatePassStatus } from '@prisma/client';

export class GatePassResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() communityId!: string;
  @ApiProperty() visitorRequestId!: string;
  @ApiProperty() passCode!: string;
  @ApiProperty({ enum: GatePassStatus }) status!: GatePassStatus;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
