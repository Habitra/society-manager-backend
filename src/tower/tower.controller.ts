// src/tower/tower.controller.ts
// ============================================================
// Tower controller.
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
import { TowerService } from './tower.service';
import { CreateTowerDto } from './dto/create-tower.dto';
import { UpdateTowerDto } from './dto/update-tower.dto';
import { TowerResponseDto } from './dto/tower-response.dto';

@ApiTags('Towers')
@ApiBearerAuth()
@Controller('towers')
export class TowerController {
  constructor(private readonly towerService: TowerService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tower in the community' })
  @ApiCreatedResponse({ type: TowerResponseDto })
  @AuditLog({ table: 'towers', captureBody: false })
  async create(
    @Body() dto: CreateTowerDto,
    @CurrentUser() user: RequestUser,
  ): Promise<TowerResponseDto> {
    return this.towerService.createTower(dto, user.id);
  }

  @Get()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all towers in the community' })
  @ApiOkResponse({ type: [TowerResponseDto] })
  async findAll(): Promise<TowerResponseDto[]> {
    return this.towerService.listTowers();
  }

  @Get(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get tower by ID' })
  @ApiOkResponse({ type: TowerResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TowerResponseDto> {
    return this.towerService.getTowerById(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tower details' })
  @ApiOkResponse({ type: TowerResponseDto })
  @AuditLog({ table: 'towers', captureBody: false })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTowerDto,
    @CurrentUser() user: RequestUser,
  ): Promise<TowerResponseDto> {
    return this.towerService.updateTower(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tower (soft delete)' })
  @ApiNoContentResponse()
  @AuditLog({ table: 'towers', captureBody: false })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.towerService.deleteTower(id, user.id);
  }
}
