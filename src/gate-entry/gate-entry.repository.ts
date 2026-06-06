// src/gate-entry/gate-entry.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class GateEntryRepository extends BaseRepository<'gateEntry'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'gateEntry', tenantContext);
  }

  async findActiveEntryByVisitor(visitorRequestId: string): Promise<Prisma.GateEntryGetPayload<object> | null> {
    return this.prisma.gateEntry.findFirst({
      where: {
        communityId: this.communityId,
        visitorRequestId,
        outTime: null,
      },
    });
  }
}
