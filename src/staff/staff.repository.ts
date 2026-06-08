import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BaseRepository } from '../database/base.repository';

@Injectable()
export class StaffProfileRepository extends BaseRepository<'staffProfile'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'staffProfile', tenantContext);
  }
}

@Injectable()
export class UserRepository extends BaseRepository<'user'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'user', tenantContext);
  }
}
