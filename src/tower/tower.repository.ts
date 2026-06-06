// src/tower/tower.repository.ts
// ============================================================
// Tower repository.
// Automatically scoped to the current tenant via BaseRepository.
// ============================================================

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class TowerRepository extends BaseRepository<'tower'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'tower', tenantContext);
  }

  /**
   * Find a tower by its short code within the current community.
   */
  async findByCode(code: string): Promise<Prisma.TowerGetPayload<object> | null> {
    return this.findOne({ code }) as Promise<Prisma.TowerGetPayload<object> | null>;
  }

  /**
   * List all towers for the current community.
   */
  async findAllTowers(): Promise<Prisma.TowerGetPayload<object>[]> {
    return this.findMany({
      orderBy: { name: 'asc' },
    }) as Promise<Prisma.TowerGetPayload<object>[]>;
  }
}
