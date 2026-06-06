// src/tower/tower.module.ts
// ============================================================
// Tower module wireup.
// ============================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { TowerController } from './tower.controller';
import { TowerService } from './tower.service';
import { TowerRepository } from './tower.repository';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule],
  controllers: [TowerController],
  providers: [TowerService, TowerRepository],
  exports: [TowerService, TowerRepository],
})
export class TowerModule {}
