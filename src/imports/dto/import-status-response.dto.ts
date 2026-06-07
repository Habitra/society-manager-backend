import { ApiProperty } from '@nestjs/swagger';
import { ImportStatus } from '@prisma/client';

export class ImportStatusResponseDto {
  @ApiProperty({ enum: ImportStatus })
  status!: ImportStatus;

  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  successRows!: number;

  @ApiProperty()
  failedRows!: number;
}
