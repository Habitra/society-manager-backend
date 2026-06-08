import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({ description: 'ID of the staff member to assign the ticket to' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;
}
