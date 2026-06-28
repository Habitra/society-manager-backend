// src/tenant/tenant.module.ts

import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';

@Global()
@Module({
  providers: [TenantContextService, TenantMiddleware],
  exports: [TenantContextService],
})
export class TenantModule {}
