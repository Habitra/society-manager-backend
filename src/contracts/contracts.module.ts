import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { RenewalIntelligenceService } from './renewal-intelligence.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [PrismaModule, TenantModule],
  providers: [ContractsService, RenewalIntelligenceService],
  exports: [ContractsService, RenewalIntelligenceService],
})
export class ContractsModule {}
