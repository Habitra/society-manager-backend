import { ApiPropertyOptional } from '@nestjs/swagger';
import { ImportStatus, ImportType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListImportsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ImportType, description: 'Filter by import type' })
  @IsOptional()
  @IsEnum(ImportType)
  type?: ImportType;

  @ApiPropertyOptional({ enum: ImportStatus, description: 'Filter by job status' })
  @IsOptional()
  @IsEnum(ImportStatus)
  status?: ImportStatus;
}
