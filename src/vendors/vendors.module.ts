import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorsAnalyticsService } from './vendors-analytics.service';
import { VendorsRatingService } from './vendors-rating.service';
import { VendorsBlacklistService } from './vendors-blacklist.service';
import { VendorRiskService } from './vendor-risk.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [VendorsController],
  providers: [
    VendorsService,
    VendorsAnalyticsService,
    VendorsRatingService,
    VendorsBlacklistService,
    VendorRiskService,
  ],
  exports: [
    VendorsService,
    VendorsAnalyticsService,
    VendorsRatingService,
    VendorsBlacklistService,
    VendorRiskService,
  ],
})
export class VendorsModule {}
