import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class FirstLoginDto {
  @ApiProperty({ example: 'JPAMAN-000001' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'TempPassword123' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'MyNewSecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
