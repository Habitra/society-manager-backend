import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateImportDto {
  @ApiProperty({ enum: ImportType, description: 'Type of data being imported' })
  @IsEnum(ImportType)
  @IsNotEmpty()
  type!: ImportType;

  @ApiProperty({ description: 'Original name of the uploaded file' })
  @IsString()
  @IsNotEmpty()
  originalFileName!: string;

  // In a real implementation, the file would be uploaded here as well
  // For this tracking framework, we just record the metadata and maybe a storage reference
  @ApiPropertyOptional({ description: 'Storage path/URL of the uploaded file' })
  @IsOptional()
  @IsString()
  storagePath?: string;
}
