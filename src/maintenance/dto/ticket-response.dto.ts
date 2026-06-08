import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';

export class TicketSnapshotDto {
  @ApiProperty({ description: 'Occupancy type at time of creation' })
  occupancyType: string;

  @ApiProperty({ description: 'Unit ID at time of creation' })
  unitId: string;

  @ApiProperty({ description: 'Tower ID at time of creation', required: false, nullable: true })
  towerId: string | null;

  @ApiProperty({ description: 'User ID of the creator at time of creation' })
  createdByUserId: string;
}

export class TicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ticketNumber: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty({ enum: TicketPriority })
  priority: TicketPriority;

  @ApiProperty()
  categoryId: string;

  @ApiProperty({ type: TicketSnapshotDto })
  snapshot: TicketSnapshotDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
