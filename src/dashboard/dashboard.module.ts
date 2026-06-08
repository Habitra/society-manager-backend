import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MaintenanceModule } from '../maintenance/maintenance.module';

import { AnnouncementModule } from '../announcement/announcement.module';

import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    CacheModule.register(),
    MaintenanceModule,
    AnnouncementModule,
    TenantModule,
    PrismaModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
