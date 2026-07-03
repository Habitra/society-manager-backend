import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AssignTicketDto {
  @ApiPropertyOptional({ description: 'ID of the staff member to assign the ticket to' })
  @IsUUID()
  @IsOptional()
  staffId?: string;

  @ApiPropertyOptional({ description: 'ID of the registered vendor to assign the ticket to' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
}
