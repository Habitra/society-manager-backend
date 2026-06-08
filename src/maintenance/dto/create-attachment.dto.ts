import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateAttachmentDto {
  @ApiProperty({ description: 'The original name of the file', example: 'leak.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'MIME type of the file', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({ description: 'Size of the file in bytes', example: 102400 })
  @IsNumber()
  @IsNotEmpty()
  fileSize: number;
}
