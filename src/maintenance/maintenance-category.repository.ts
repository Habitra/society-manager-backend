import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { FindOptions } from '../database/repository.types';

@Injectable()
export class MaintenanceCategoryRepository extends BaseRepository<'maintenanceCategory'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'maintenanceCategory', tenantContext);
  }

  protected override baseWhere(options?: FindOptions): Record<string, unknown> {
    return {
      communityId: this.communityId,
    };
  }
}
