import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OccupancyType } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateResidentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emergencyContactName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emergencyContactNumber!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  emergencyContactRelation!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ enum: OccupancyType })
  @IsEnum(OccupancyType)
  occupancyType!: OccupancyType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryResident?: boolean;
}
