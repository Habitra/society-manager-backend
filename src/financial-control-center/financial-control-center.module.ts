import { Module } from '@nestjs/common';
import { FinancialControlCenterController } from './financial-control-center.controller';
import { FinancialControlCenterService } from './financial-control-center.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule],
  controllers: [FinancialControlCenterController],
  providers: [FinancialControlCenterService],
})
export class FinancialControlCenterModule {}
