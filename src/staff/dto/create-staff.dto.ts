import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { StaffCategory } from '@prisma/client';

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  @ValidateIf(o => o.email !== '')
  @IsOptional()
  email?: string;

  @ApiProperty({ enum: StaffCategory })
  @IsEnum(StaffCategory)
  staffType: StaffCategory;
}
