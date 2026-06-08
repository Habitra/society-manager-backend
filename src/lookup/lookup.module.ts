import { Module } from '@nestjs/common';
import { LookupService } from './lookup.service';
import { LookupController } from './lookup.controller';

import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TenantModule, PrismaModule],
  controllers: [LookupController],
  providers: [LookupService],
})
export class LookupModule {}
