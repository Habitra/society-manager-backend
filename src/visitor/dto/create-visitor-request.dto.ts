// src/visitor/dto/create-visitor-request.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitorEntryMode, VisitorType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVisitorRequestDto {
  @ApiProperty({ description: 'The unit the visitor is visiting', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  visitorName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitorPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiProperty({ enum: VisitorType })
  @IsEnum(VisitorType)
  visitorType!: VisitorType;

  @ApiProperty({ enum: VisitorEntryMode })
  @IsEnum(VisitorEntryMode)
  entryMode!: VisitorEntryMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  validFrom!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;
}
