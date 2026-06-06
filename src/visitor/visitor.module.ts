// src/visitor/visitor.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { GatePassModule } from '../gate-pass/gate-pass.module';
import { VisitorController } from './visitor.controller';
import { VisitorService } from './visitor.service';
import { VisitorRepository } from './visitor.repository';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule, GatePassModule],
  controllers: [VisitorController],
  providers: [VisitorService, VisitorRepository],
  exports: [VisitorService, VisitorRepository],
})
export class VisitorModule {}
