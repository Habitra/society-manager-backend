// src/unit/unit.repository.ts
// ============================================================
// Unit repository.
// Scoped to tenant via BaseRepository.
// ============================================================

import { Injectable } from '@nestjs/common';
import { Prisma, UnitOccupancyType, UnitType } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { toPrismaPage } from '../common/utils/pagination.util';
import { ListUnitsDto } from './dto/list-units.dto';

@Injectable()
export class UnitRepository extends BaseRepository<'unit'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'unit', tenantContext);
  }

  /**
   * Find a unit by unitNumber within a specific tower (or without a tower).
   */
  async findByUnitNumber(unitNumber: string, towerId: string | null): Promise<Prisma.UnitGetPayload<object> | null> {
    return this.findOne({ unitNumber, towerId }) as Promise<Prisma.UnitGetPayload<object> | null>;
  }

  /**
   * List units with pagination, search, and filtering.
   */
  async findPaginated(dto: ListUnitsDto): Promise<{ items: Prisma.UnitGetPayload<{ include: { tower: true } }>[]; total: number }> {
    const { skip, take } = toPrismaPage(dto);

    const where: Prisma.UnitWhereInput = {
      communityId: this.communityId,
      deletedAt: null,
    };

    if (dto.towerId) where.towerId = dto.towerId;
    if (dto.type) where.type = dto.type as UnitType;
    if (dto.occupancy) where.occupancy = dto.occupancy as UnitOccupancyType;
    if (dto.search) {
      where.OR = [
        { unitNumber: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        skip,
        take,
        include: { tower: true },
        orderBy: [{ towerId: 'asc' }, { unitNumber: 'asc' }],
      }),
      this.prisma.unit.count({ where }),
    ]);

    return { items, total };
  }
}
