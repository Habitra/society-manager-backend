import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { StaffCategory, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class ListStaffDto {
  @ApiPropertyOptional({ description: 'Filter by exact staffType (StaffCategory)' })
  @IsOptional()
  @IsEnum(StaffCategory)
  staffType?: StaffCategory;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsEnum(UserStatus)
  activeStatus?: UserStatus;

  @ApiPropertyOptional({ description: 'Search query for name, phone, email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
