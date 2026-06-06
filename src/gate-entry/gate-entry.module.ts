// src/gate-entry/gate-entry.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { GatePassModule } from '../gate-pass/gate-pass.module';
import { VisitorModule } from '../visitor/visitor.module';
import { GateEntryController } from './gate-entry.controller';
import { GateEntryService } from './gate-entry.service';
import { GateEntryRepository } from './gate-entry.repository';

@Module({
  imports: [PrismaModule, TenantModule, GatePassModule, VisitorModule],
  controllers: [GateEntryController],
  providers: [GateEntryService, GateEntryRepository],
  exports: [GateEntryService, GateEntryRepository],
})
export class GateEntryModule {}
