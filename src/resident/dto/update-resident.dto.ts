import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { OccupancyType, UserRole, VerificationStage } from '@prisma/client';

export class UpdateResidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional({ enum: OccupancyType })
  @IsOptional()
  @IsEnum(OccupancyType)
  occupancyType?: OccupancyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ enum: VerificationStage })
  @IsOptional()
  @IsEnum(VerificationStage)
  verificationStage?: VerificationStage;
}
