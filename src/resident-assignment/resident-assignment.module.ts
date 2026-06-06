// src/resident-assignment/resident-assignment.module.ts
// ============================================================
// Resident Assignment module wireup.
// ============================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { UnitModule } from '../unit/unit.module';
import { ResidentAssignmentController } from './resident-assignment.controller';
import { ResidentAssignmentService } from './resident-assignment.service';
import { ResidentAssignmentRepository } from './resident-assignment.repository';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule, UnitModule],
  controllers: [ResidentAssignmentController],
  providers: [ResidentAssignmentService, ResidentAssignmentRepository],
  exports: [ResidentAssignmentService, ResidentAssignmentRepository],
})
export class ResidentAssignmentModule {}
