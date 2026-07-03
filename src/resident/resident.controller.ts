import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { ResidentService } from './resident.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { ListResidentsDto } from './dto/list-residents.dto';
import { AssignedUnitDto, ResidentCredentialsResponseDto, ResidentResponseDto } from './dto/resident-response.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { UpdateResidentAccessDto } from './dto/update-resident-access.dto';
import { AddFamilyMemberDto } from './dto/add-family-member.dto';
import { ReassignUnitDto } from './dto/reassign-unit.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';

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
  @ApiPaginatedResponse(ResidentResponseDto)
  async listResidents(@Query() dto: ListResidentsDto): Promise<PaginatedResult<ResidentResponseDto>> {
    return this.residentService.listResidents(dto);
  }

  @Get('dashboard')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get KPI metrics for Resident Operations Center dashboard' })
  async getDashboardMetrics(): Promise<any> {
    return this.residentService.getDashboardMetrics();
  }

  // ===========================================================================
  // TENANT VERIFICATION CENTER
  // ===========================================================================

  @Get('tenant-verifications/metrics')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get KPI metrics for Tenant Verification Center' })
  async getTenantVerificationMetrics(): Promise<any> {
    return this.residentService.getTenantVerificationMetrics();
  }

  @Get('tenant-verifications')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List residents in tenant verification workflow' })
  @ApiPaginatedResponse(ResidentResponseDto)
  async listTenantVerifications(@Query() dto: ListResidentsDto): Promise<PaginatedResult<ResidentResponseDto>> {
    if (dto.verificationStage === 'APPROVED' || dto.verificationStage === 'REJECTED') {
      return this.residentService.getTenantVerificationHistory(dto);
    }
    return this.residentService.getTenantVerificationQueue(dto);
  }

  @Patch('tenant-verifications/:id/review')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Review and update verification stage for a resident' })
  async reviewTenantVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('action') action: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW',
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    return this.residentService.updateVerificationStage(id, action, user.id);
  }

  // ===========================================================================
  // RESIDENT MANAGEMENT
  // ===========================================================================

  @Get(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get resident details by ID' })
  @ApiOkResponse({ type: ResidentResponseDto })
  async getResidentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    if (user.role === UserRole.RESIDENT && user.id !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.residentService.getResidentById(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Update resident details' })
  @ApiOkResponse({ type: ResidentResponseDto })
  async updateResident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    if (user.role === UserRole.RESIDENT && user.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.residentService.updateResident(id, dto, user.id);
  }

  @Post(':id/family')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a family member to a resident account' })
  @ApiCreatedResponse({ type: ResidentCredentialsResponseDto })
  async addFamilyMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddFamilyMemberDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentCredentialsResponseDto> {
    return this.residentService.addFamilyMember(id, dto, user.id);
  }

  @Patch(':id/units/reassign')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reassign resident to a new unit' })
  @ApiOkResponse({ type: ResidentResponseDto })
  async reassignUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignUnitDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    return this.residentService.reassignUnit(id, dto, user.id);
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
  async getAssignedUnits(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<AssignedUnitDto[]> {
    if (user.role === UserRole.RESIDENT && user.id !== id) {
      throw new ForbiddenException('You can only access your own assigned units');
    }
    const resident = await this.residentService.getResidentById(id);
    return resident.assignedUnits;
  }

  @Get(':id/current-unit')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get the primary unit assigned to a resident' })
  @ApiOkResponse({ type: AssignedUnitDto })
  async getCurrentUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<AssignedUnitDto | null> {
    if (user.role === UserRole.RESIDENT && user.id !== id) {
      throw new ForbiddenException('You can only access your own primary unit');
    }
    const resident = await this.residentService.getResidentById(id);
    return resident.assignedUnits.find((u) => u.isPrimary) || null;
  }

  // ===========================================================================
  // RESIDENT OPERATIONS CENTER (PHASES 4-5)
  // ===========================================================================

  @Patch(':id/verify')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update verification stage of a resident' })
  async updateVerificationStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stage') stage: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW',
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    return this.residentService.updateVerificationStage(id, stage, user.id);
  }

  @Post(':id/send-otp')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Send an onboarding OTP to a pending resident' })
  async sendOnboardingOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.residentService.sendOnboardingOtp(id, user.id);
  }

  @Post(':id/verify-otp')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Verify the onboarding OTP for a resident' })
  async verifyOnboardingOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('otp') otp: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.residentService.verifyOnboardingOtp(id, otp, user.id);
  }

  // ===========================================================================
  // RESIDENT OPERATIONS CENTER (PHASES 6-12)
  // ===========================================================================

  @Get('occupancy')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get occupancy details' })
  async getOccupancy(): Promise<any[]> {
    return this.residentService.getOccupancy();
  }

  @Patch('occupancy/:unitId/primary-resident')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Change the primary resident of a unit' })
  async setPrimaryResident(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: boolean }> {
    return this.residentService.setPrimaryResident(unitId, userId, user.id);
  }

  @Get('vehicles')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all resident vehicles' })
  async getVehicles(): Promise<any[]> {
    return this.residentService.getVehicles();
  }

  @Patch(':id/access')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update resident access control status' })
  async updateAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentAccessDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentResponseDto> {
    return this.residentService.updateAccess(id, dto, user.id);
  }

  @Post('handover')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Process unit handover' })
  async processHandover(
    @Body('unitId') unitId: string,
    @Body('currentOwnerId') currentOwnerId: string,
    @Body('newOwnerId') newOwnerId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: boolean }> {
    return this.residentService.processHandover(unitId, currentOwnerId, newOwnerId, user.id);
  }

  @Get(':id/audit')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get resident audit trail' })
  async getResidentAuditTrail(@Param('id', ParseUUIDPipe) id: string): Promise<any[]> {
    return this.residentService.getResidentAuditTrail(id);
  }

  @Get('analytics')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get resident analytics' })
  async getAnalytics(): Promise<any> {
    return this.residentService.getAnalytics();
  }
}
