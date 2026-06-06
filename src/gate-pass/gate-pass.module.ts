// src/gate-pass/gate-pass.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { GatePassController } from './gate-pass.controller';
import { GatePassService } from './gate-pass.service';
import { GatePassRepository } from './gate-pass.repository';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [GatePassController],
  providers: [GatePassService, GatePassRepository],
  exports: [GatePassService, GatePassRepository],
})
export class GatePassModule {}
