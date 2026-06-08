import { ApiProperty } from '@nestjs/swagger';

export class VisitorDashboardDto {
  @ApiProperty()
  expectedVisitorsToday: number;

  @ApiProperty()
  checkedInVisitors: number;

  @ApiProperty()
  checkedOutVisitors: number;

  @ApiProperty()
  activeGatePasses: number;

  @ApiProperty()
  expiredGatePasses: number;
}
