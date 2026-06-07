import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { ImportsRepository } from './imports.repository';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsRepository],
  exports: [ImportsService],
})
export class ImportsModule {}
