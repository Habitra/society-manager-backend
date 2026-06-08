// src/tower/tower.service.ts
// ============================================================
// Tower service.
// Business logic for managing towers within a community.
// ============================================================

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CreateTowerDto } from './dto/create-tower.dto';
import { UpdateTowerDto } from './dto/update-tower.dto';
import { TowerResponseDto } from './dto/tower-response.dto';
import { TowerRepository } from './tower.repository';
import { PaginationDto } from '../common/dto/pagination.dto';
import { toPaginatedResult, toPrismaPage } from '../common/utils/pagination.util';

@Injectable()
export class TowerService {
  constructor(
    private readonly towerRepository: TowerRepository,
    private readonly auditService: AuditService,
  ) {}

  async createTower(dto: CreateTowerDto, actorId: string): Promise<TowerResponseDto> {
    const existing = await this.towerRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`A tower with code '${dto.code}' already exists in this community.`);
    }

    const tower = await this.towerRepository.create({
      name: dto.name,
      code: dto.code,
      totalFloors: dto.totalFloors ?? 0,
      totalUnits: dto.totalUnits ?? 0,
      amenities: dto.amenities ?? [],
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'towers',
      recordId: tower.id as string,
      newValues: { name: tower.name, code: tower.code },
    });

    return tower as unknown as TowerResponseDto;
  }

  async listTowers(dto: PaginationDto) {
    const { skip, take } = toPrismaPage(dto);

    const [towers, total] = await Promise.all([
      this.towerRepository.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.towerRepository.count({}),
    ]);

    return toPaginatedResult(towers as unknown as TowerResponseDto[], total, dto);
  }

  async getTowerById(id: string): Promise<TowerResponseDto> {
    const tower = await this.towerRepository.findById(id);
    return tower as unknown as TowerResponseDto;
  }

  async updateTower(id: string, dto: UpdateTowerDto, actorId: string): Promise<TowerResponseDto> {
    const tower = await this.towerRepository.findById(id);

    if (dto.code && dto.code !== tower.code) {
      const existing = await this.towerRepository.findByCode(dto.code);
      if (existing) {
        throw new ConflictException(`Tower code '${dto.code}' is already in use.`);
      }
    }

    const updated = await this.towerRepository.update(id, { ...dto });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'towers',
      recordId: id,
      newValues: dto as Record<string, unknown>,
    });

    return updated as unknown as TowerResponseDto;
  }

  async deleteTower(id: string, actorId: string): Promise<void> {
    // Soft delete via BaseRepository (checks tenant context internally)
    await this.towerRepository.softDelete(id);

    void this.auditService.write({
      actorId,
      action: AuditAction.SOFT_DELETE,
      tableName: 'towers',
      recordId: id,
    });
  }
}
