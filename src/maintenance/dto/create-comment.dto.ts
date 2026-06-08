import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'The plumber has been informed.' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({ default: false, description: 'True if comment is only visible to admins/staff' })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}

export class UpdateCommentDto {
  @ApiPropertyOptional({ example: 'The plumber has been informed and is on the way.' })
  @IsString()
  @IsOptional()
  comment?: string;
}
