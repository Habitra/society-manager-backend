// src/visitor/dto/visitor-request-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitorEntryMode, VisitorRequestStatus, VisitorType } from '@prisma/client';

export class VisitorRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() communityId!: string;
  @ApiProperty() requestedById!: string;
  @ApiProperty() unitId!: string;
  @ApiProperty() visitorName!: string;
  @ApiPropertyOptional() visitorPhone?: string | null;
  @ApiPropertyOptional() vehicleNumber?: string | null;
  @ApiProperty({ enum: VisitorType }) visitorType!: VisitorType;
  @ApiProperty({ enum: VisitorEntryMode }) entryMode!: VisitorEntryMode;
  @ApiProperty({ enum: VisitorRequestStatus }) status!: VisitorRequestStatus;
  @ApiPropertyOptional() purpose?: string | null;
  @ApiProperty() validFrom!: Date;
  @ApiPropertyOptional() validUntil?: Date | null;
  @ApiPropertyOptional() responseDeadline?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
