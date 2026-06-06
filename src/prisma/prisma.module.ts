// src/prisma/prisma.module.ts
// ============================================================
// Global module: PrismaService is available everywhere without
// needing to import PrismaModule in each feature module.
// ============================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
