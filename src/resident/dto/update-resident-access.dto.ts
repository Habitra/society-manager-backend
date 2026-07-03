import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum AccessAction {
  SUSPEND = 'SUSPEND',
  RESTORE = 'RESTORE',
  FORCE_LOGOUT = 'FORCE_LOGOUT',
  LOCK = 'LOCK',
  UNLOCK = 'UNLOCK',
}

export class UpdateResidentAccessDto {
  @ApiProperty({ enum: AccessAction })
  @IsEnum(AccessAction)
  action: AccessAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
