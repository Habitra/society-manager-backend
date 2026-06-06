import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone!: string;
}
