// src/resident-assignment/resident-assignment.controller.ts
// ============================================================
// Resident Assignment controller.
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { ResidentAssignmentService } from './resident-assignment.service';
import { AssignResidentDto } from './dto/assign-resident.dto';
import { ResidentAssignmentResponseDto } from './dto/resident-assignment-response.dto';

@ApiTags('Resident Assignments')
@ApiBearerAuth()
@Controller('resident-assignments')
export class ResidentAssignmentController {
  constructor(private readonly assignmentService: ResidentAssignmentService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a resident to a unit' })
  @ApiCreatedResponse({ type: ResidentAssignmentResponseDto })
  @AuditLog({ table: 'resident_unit_assignments', captureBody: false })
  async assign(
    @Body() dto: AssignResidentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentAssignmentResponseDto> {
    return this.assignmentService.assignResident(dto, user.id);
  }

  @Get('unit/:unitId')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.GUARD)
  @ApiOperation({ summary: 'List residents in a specific unit' })
  @ApiOkResponse({ type: [ResidentAssignmentResponseDto] })
  async getByUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ): Promise<ResidentAssignmentResponseDto[]> {
    return this.assignmentService.listResidentsInUnit(unitId);
  }

  @Get('user/:userId')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List units assigned to a specific resident' })
  @ApiOkResponse({ type: [ResidentAssignmentResponseDto] })
  async getByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ResidentAssignmentResponseDto[]> {
    return this.assignmentService.listUnitsForResident(userId);
  }

  @Patch(':id/primary')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark an assignment as the primary resident for the unit' })
  @ApiOkResponse({ type: ResidentAssignmentResponseDto })
  @AuditLog({ table: 'resident_unit_assignments', captureBody: false })
  async setPrimary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ResidentAssignmentResponseDto> {
    return this.assignmentService.setPrimary(id, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a resident assignment' })
  @ApiNoContentResponse()
  @AuditLog({ table: 'resident_unit_assignments', captureBody: false })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.assignmentService.removeAssignment(id, user.id);
  }
}
