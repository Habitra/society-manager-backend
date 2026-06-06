// src/unit/unit.controller.ts
// ============================================================
// Unit controller.
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
  Query,
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
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { ListUnitsDto } from './dto/list-units.dto';

@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new unit' })
  @ApiCreatedResponse({ type: UnitResponseDto })
  @AuditLog({ table: 'units', captureBody: false })
  async create(
    @Body() dto: CreateUnitDto,
    @CurrentUser() user: RequestUser,
  ): Promise<UnitResponseDto> {
    return this.unitService.createUnit(dto, user.id);
  }

  @Get()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.GUARD)
  @ApiOperation({ summary: 'List and search units' })
  @ApiPaginatedResponse(UnitResponseDto)
  async findAll(@Query() query: ListUnitsDto) {
    return this.unitService.listUnits(query);
  }

  @Get(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.GUARD)
  @ApiOperation({ summary: 'Get unit details by ID' })
  @ApiOkResponse({ type: UnitResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UnitResponseDto> {
    return this.unitService.getUnitById(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update unit details' })
  @ApiOkResponse({ type: UnitResponseDto })
  @AuditLog({ table: 'units', captureBody: false })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: RequestUser,
  ): Promise<UnitResponseDto> {
    return this.unitService.updateUnit(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.COMMUNITY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a unit (soft delete)' })
  @ApiNoContentResponse()
  @AuditLog({ table: 'units', captureBody: false })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.unitService.deleteUnit(id, user.id);
  }
}
