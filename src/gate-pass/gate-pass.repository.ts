// src/gate-pass/gate-pass.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class GatePassRepository extends BaseRepository<'gatePass'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'gatePass', tenantContext);
  }

  async findByPassCodeOrToken(codeOrToken: string): Promise<Prisma.GatePassGetPayload<object> | null> {
    return this.prisma.gatePass.findFirst({
      where: {
        communityId: this.communityId,
        deletedAt: null,
        OR: [
          { passCode: codeOrToken },
          { qrToken: codeOrToken },
        ],
      },
    });
  }
}
