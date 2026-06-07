import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportStatus, ImportType } from '@prisma/client';

export class ImportJobResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  communityId!: string;

  @ApiProperty({ enum: ImportType })
  type!: ImportType;

  @ApiProperty({ enum: ImportStatus })
  status!: ImportStatus;

  @ApiProperty()
  originalFileName!: string;

  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  successRows!: number;

  @ApiProperty()
  failedRows!: number;

  @ApiPropertyOptional()
  errorFilePath?: string | null;

  @ApiPropertyOptional()
  resultFilePath?: string | null;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiProperty({ format: 'uuid' })
  createdById!: string;

  @ApiProperty()
  createdAt!: Date;
}
