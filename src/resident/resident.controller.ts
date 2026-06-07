import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { PaginatedResult } from '../common/utils/pagination.util';
import { ResidentService } from './resident.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { ListResidentsDto } from './dto/list-residents.dto';
import { AssignedUnitDto, ResidentCredentialsResponseDto, ResidentResponseDto } from './dto/resident-response.dto';

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new resident and their profile/assignment' })
  @ApiCreatedResponse({ type: ResidentCredentialsResponseDto })
  async createResident(
    @Body() dto: CreateResidentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentCredentialsResponseDto> {
    return this.residentService.createResident(dto, user.id);
  }

  @Get()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.GUARD)
  @ApiOperation({ summary: 'List residents with filters and pagination' })
  async listResidents(@Query() dto: ListResidentsDto): Promise<PaginatedResult<ResidentResponseDto>> {
    return this.residentService.listResidents(dto);
  }

  @Get(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get resident details by ID' })
  @ApiOkResponse({ type: ResidentResponseDto })
  async getResidentById(@Param('id', ParseUUIDPipe) id: string): Promise<ResidentResponseDto> {
    return this.residentService.getResidentById(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Activate a resident account' })
  @ApiOkResponse({ type: ResidentResponseDto })
  async activateResident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    return this.residentService.activateResident(id, user.id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate a resident account' })
  @ApiOkResponse({ type: ResidentResponseDto })
  async deactivateResident(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    return this.residentService.deactivateResident(id, user.id);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reset a resident password (generates a new temporary password)' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ temporaryPassword: string }> {
    return this.residentService.resetPassword(id, user.id);
  }

  @Get(':id/units')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get all units assigned to a resident' })
  @ApiOkResponse({ type: [AssignedUnitDto] })
  async getAssignedUnits(@Param('id', ParseUUIDPipe) id: string): Promise<AssignedUnitDto[]> {
    const resident = await this.residentService.getResidentById(id);
    return resident.assignedUnits;
  }

  @Get(':id/current-unit')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get the primary unit assigned to a resident' })
  @ApiOkResponse({ type: AssignedUnitDto })
  async getCurrentUnit(@Param('id', ParseUUIDPipe) id: string): Promise<AssignedUnitDto | null> {
    const resident = await this.residentService.getResidentById(id);
    return resident.assignedUnits.find((u) => u.isPrimary) || null;
  }
}
