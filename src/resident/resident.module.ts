import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { ResidentService } from './resident.service';
import { ResidentController } from './resident.controller';
import { ResidentRepository } from './resident.repository';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule],
  controllers: [ResidentController],
  providers: [ResidentService, ResidentRepository],
  exports: [ResidentService],
})
export class ResidentModule {}
