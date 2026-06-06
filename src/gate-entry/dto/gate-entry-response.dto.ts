// src/gate-entry/dto/gate-entry-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GateEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() communityId!: string;
  @ApiPropertyOptional() visitorRequestId?: string | null;
  @ApiPropertyOptional() gatePassId?: string | null;
  @ApiPropertyOptional() guardId?: string | null;
  @ApiProperty() visitorName!: string;
  @ApiPropertyOptional() vehicleNumber?: string | null;
  @ApiProperty() isVehicleEntry!: boolean;
  @ApiProperty() inTime!: Date;
  @ApiPropertyOptional() outTime?: Date | null;
  @ApiProperty() createdAt!: Date;
}
