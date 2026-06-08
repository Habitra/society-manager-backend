import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceDashboardDto {
  @ApiProperty()
  openTickets: number;

  @ApiProperty()
  inProgressTickets: number;

  @ApiProperty()
  resolvedTickets: number;

  @ApiProperty()
  closedTickets: number;

  @ApiProperty()
  ticketsByCategory: any[];

  @ApiProperty()
  ticketsByPriority: any[];
}
