import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffDto } from './dto/list-staff.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Staff & Guard Management')
@ApiBearerAuth()

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new staff or guard' })
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.staffService.createStaff(dto);
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Get()
  @ApiOperation({ summary: 'List all staff members' })
  @ApiPaginatedResponse(Object) // Ideally StaffResponseDto, using Object as fallback if undefined
  async listStaff(@Query() dto: ListStaffDto) {
    return this.staffService.listStaff(dto);
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Get('guards')
  @ApiOperation({ summary: 'List all security guards' })
  async getGuards() {
    return this.staffService.getGuards();
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Get(':id')
  @ApiOperation({ summary: 'Get staff details' })
  async getStaffById(@Param('id') id: string) {
    return this.staffService.getStaffById(id);
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Get(':id/tickets')
  @ApiOperation({ summary: 'Get tickets assigned to a staff' })
  async getStaffTickets(@Param('id') id: string) {
    return this.staffService.getStaffTickets(id);
  }

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate staff' })
  async activateStaff(@Param('id') id: string) {
    return this.staffService.activateStaff(id);
  }

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate staff' })
  async deactivateStaff(@Param('id') id: string) {
    return this.staffService.deactivateStaff(id);
  }
}
