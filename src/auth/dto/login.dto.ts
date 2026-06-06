import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'JPAMAN-000001' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'TempPassword123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
