import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffProfileRepository, UserRepository } from './staff.repository';
import { AuditModule } from '../audit/audit.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';

import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuditModule, MaintenanceModule, TenantModule, PrismaModule],
  controllers: [StaffController],
  providers: [StaffService, StaffProfileRepository, UserRepository],
  exports: [StaffService],
})
export class StaffModule {}
