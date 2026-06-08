import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VisitorEntryMode, VisitorRequestStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListVisitorsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VisitorRequestStatus })
  @IsOptional()
  @IsEnum(VisitorRequestStatus)
  status?: VisitorRequestStatus;

  @ApiPropertyOptional({ enum: VisitorEntryMode })
  @IsOptional()
  @IsEnum(VisitorEntryMode)
  entryMode?: VisitorEntryMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
