import { ApiProperty } from '@nestjs/swagger';

export class DashboardOverviewDto {
  @ApiProperty()
  totalResidents: number;

  @ApiProperty()
  activeResidents: number;

  @ApiProperty()
  totalUnits: number;

  @ApiProperty()
  occupiedUnits: number;

  @ApiProperty()
  vacantUnits: number;

  @ApiProperty()
  totalVisitorsToday: number;

  @ApiProperty()
  openTickets: number;

  @ApiProperty()
  resolvedTickets: number;

  @ApiProperty()
  unreadAnnouncementsCount?: number;

  @ApiProperty({ required: false })
  recentAnnouncements?: any[];

  @ApiProperty({ required: false })
  pinnedAnnouncements?: any[];
}
