import { Module } from '@nestjs/common';
import { AmenityService } from './amenity.service';
import { AmenityController } from './amenity.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, TenantModule, AuditModule],
  controllers: [AmenityController],
  providers: [AmenityService],
})
export class AmenityModule {}
