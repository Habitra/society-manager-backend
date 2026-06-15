import { Module } from '@nestjs/common';
import { SecurityGuardsService } from './security-guards.service';
import { SecurityGuardsController } from './security-guards.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule],
  controllers: [SecurityGuardsController],
  providers: [SecurityGuardsService],
  exports: [SecurityGuardsService],
})
export class SecurityGuardsModule {}
