import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class MaintenanceAttachmentRepository extends BaseRepository<'maintenanceAttachment'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'maintenanceAttachment', tenantContext);
  }
}
