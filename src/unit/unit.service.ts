// src/unit/unit.service.ts
// ============================================================
// Unit service.
// Business logic for managing units.
// ============================================================

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { toPaginatedResult } from '../common/utils/pagination.util';
import { TowerRepository } from '../tower/tower.repository';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsDto } from './dto/list-units.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitRepository } from './unit.repository';

@Injectable()
export class UnitService {
  constructor(
    private readonly unitRepository: UnitRepository,
    private readonly towerRepository: TowerRepository,
    private readonly auditService: AuditService,
  ) {}

  async createUnit(dto: CreateUnitDto, actorId: string): Promise<UnitResponseDto> {
    if (dto.towerId) {
      const towerExists = await this.towerRepository.exists(dto.towerId);
      if (!towerExists) {
        throw new NotFoundException(`Tower '${dto.towerId}' not found.`);
      }
    }

    const existing = await this.unitRepository.findByUnitNumber(dto.unitNumber, dto.towerId ?? null);
    if (existing) {
      throw new ConflictException(
        `Unit '${dto.unitNumber}' already exists${dto.towerId ? ' in this tower' : ''}.`,
      );
    }

    const unit = await this.unitRepository.create({
      towerId: dto.towerId ?? null,
      unitNumber: dto.unitNumber,
      floor: dto.floor,
      type: dto.type,
      occupancy: dto.occupancy,
      areaSqFt: dto.areaSqFt,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      isCommercial: dto.isCommercial,
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'units',
      recordId: unit.id as string,
      newValues: { unitNumber: unit.unitNumber, towerId: unit.towerId },
    });

    return unit as unknown as UnitResponseDto;
  }

  async listUnits(dto: ListUnitsDto): Promise<PaginatedResult<UnitResponseDto>> {
    const { items, total } = await this.unitRepository.findPaginated(dto);
    return toPaginatedResult(items as unknown as UnitResponseDto[], total, dto);
  }

  async getUnitById(id: string): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findById(id, { include: { tower: true } });
    return unit as unknown as UnitResponseDto;
  }

  async updateUnit(id: string, dto: UpdateUnitDto, actorId: string): Promise<UnitResponseDto> {
    const unit = await this.unitRepository.findById(id);

    if (dto.towerId && dto.towerId !== unit.towerId) {
      const towerExists = await this.towerRepository.exists(dto.towerId);
      if (!towerExists) {
        throw new NotFoundException(`Tower '${dto.towerId}' not found.`);
      }
    }

    const newUnitNumber = dto.unitNumber ?? unit.unitNumber;
    const newTowerId = dto.towerId !== undefined ? dto.towerId : unit.towerId;

    if (newUnitNumber !== unit.unitNumber || newTowerId !== unit.towerId) {
      const existing = await this.unitRepository.findByUnitNumber(newUnitNumber as string, newTowerId as string | null);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Unit '${newUnitNumber}' already exists${newTowerId ? ' in this tower' : ''}.`,
        );
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    // Handle explicit nulling of towerId
    if (dto.towerId === null) {
      updateData.towerId = null;
    }

    const updated = await this.unitRepository.update(id, updateData);

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'units',
      recordId: id,
      newValues: updateData,
    });

    return updated as unknown as UnitResponseDto;
  }

  async deleteUnit(id: string, actorId: string): Promise<void> {
    await this.unitRepository.softDelete(id);

    void this.auditService.write({
      actorId,
      action: AuditAction.SOFT_DELETE,
      tableName: 'units',
      recordId: id,
    });
  }
}
