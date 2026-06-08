import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TargetAudience, AnnouncementPriority, AnnouncementStatus } from '@prisma/client';

export class AnnouncementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: AnnouncementPriority })
  priority: AnnouncementPriority;

  @ApiProperty({ enum: AnnouncementStatus })
  status: AnnouncementStatus;

  @ApiProperty({ enum: TargetAudience, isArray: true })
  targetAudiences: TargetAudience[];

  @ApiProperty()
  isPinned: boolean;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  attachments?: any;

  @ApiProperty()
  createdAt: Date;
}
