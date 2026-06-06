// src/visitor/visitor.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class VisitorRepository extends BaseRepository<'visitorRequest'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'visitorRequest', tenantContext);
  }

  async findByUnitId(unitId: string): Promise<Prisma.VisitorRequestGetPayload<object>[]> {
    return this.findMany({
      where: { unitId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Prisma.VisitorRequestGetPayload<object>[]>;
  }
}
