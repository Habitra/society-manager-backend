import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LookupService } from './lookup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, StaffCategory } from '@prisma/client';

@ApiTags('Lookups')
@ApiBearerAuth()

@Controller('lookups')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('towers')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Lightweight tower lookup' })
  async getTowers() {
    return this.lookupService.getTowers();
  }

  @Get('units')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT, UserRole.GUARD)
  @ApiOperation({ summary: 'Lightweight unit lookup' })
  @ApiQuery({ name: 'towerId', required: false, type: String })
  async getUnits(@Query('towerId') towerId?: string) {
    return this.lookupService.getUnits(towerId);
  }

  @Get('staff')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Lightweight staff lookup' })
  @ApiQuery({ name: 'category', required: false, enum: StaffCategory })
  async getStaff(@Query('category') category?: StaffCategory) {
    return this.lookupService.getStaff(category);
  }

  @Get('residents')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Lightweight resident lookup' })
  async getResidents() {
    return this.lookupService.getResidents();
  }
}
