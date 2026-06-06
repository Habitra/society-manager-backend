// src/gate-pass/dto/validate-pass.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePassDto {
  @ApiProperty({ description: 'QR Token or Pass Code' })
  @IsString()
  @IsNotEmpty()
  codeOrToken!: string;
}
