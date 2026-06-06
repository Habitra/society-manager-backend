// src/gate-entry/dto/record-entry.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordEntryDto {
  @ApiPropertyOptional({ description: 'Gate pass ID if validating via QR' })
  @IsOptional()
  @IsUUID()
  gatePassId?: string;

  @ApiPropertyOptional({ description: 'Visitor request ID if direct entry without QR (e.g., approved on arrival)' })
  @IsOptional()
  @IsUUID()
  visitorRequestId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  visitorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVehicleEntry?: boolean;
}
