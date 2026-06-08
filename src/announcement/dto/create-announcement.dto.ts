import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsArray, 
  IsBoolean, 
  IsDateString 
} from 'class-validator';
import { 
  TargetAudience, 
  AnnouncementPriority, 
  AnnouncementStatus 
} from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Annual General Meeting' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Important update regarding AGM' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '<p>Please attend the meeting...</p>' })
  @IsString()
  content: string;

  @ApiProperty({ enum: AnnouncementPriority, default: AnnouncementPriority.NORMAL })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({ enum: TargetAudience, isArray: true })
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  targetAudiences: TargetAudience[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
