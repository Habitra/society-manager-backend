import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { InvoiceCycleFrequency } from '@prisma/client';

export class CreateInvoiceCycleDto {
  @ApiProperty({ example: 'January 2026 Maintenance' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: InvoiceCycleFrequency, example: 'MONTHLY' })
  @IsEnum(InvoiceCycleFrequency)
  frequency: InvoiceCycleFrequency;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '2026-02-05' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @ApiPropertyOptional({ example: 'FLAT' })
  @IsOptional()
  @IsString()
  lateFeeType?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateFeeValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}
