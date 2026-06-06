// src/unit/unit.module.ts
// ============================================================
// Unit module wireup.
// ============================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { TowerModule } from '../tower/tower.module';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';
import { UnitRepository } from './unit.repository';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule, TowerModule],
  controllers: [UnitController],
  providers: [UnitService, UnitRepository],
  exports: [UnitService, UnitRepository],
})
export class UnitModule {}
