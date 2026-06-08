import { ApiProperty } from '@nestjs/swagger';

export class OccupancyDashboardDto {
  @ApiProperty()
  ownerResidents: number;

  @ApiProperty()
  tenants: number;

  @ApiProperty()
  nonResidentOwners: number;
}
