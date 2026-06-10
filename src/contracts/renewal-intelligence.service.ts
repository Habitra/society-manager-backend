import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class RenewalIntelligenceService {
  private readonly logger = new Logger(RenewalIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Fetch the Renewal Intelligence Dashboard Data
   */
  async getDashboardData() {
    const communityId = this.tenantContext.communityId;
    
    const now = new Date();
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);
    const next60 = new Date();
    next60.setDate(now.getDate() + 60);
    const next90 = new Date();
    next90.setDate(now.getDate() + 90);

    const contracts = await this.prisma.contract.findMany({
      where: { communityId, status: 'ACTIVE' },
      include: { vendor: { select: { name: true } } },
    });

    const expiring30 = contracts.filter((c) => c.endDate <= next30);
    const expiring60 = contracts.filter((c) => c.endDate > next30 && c.endDate <= next60);
    const expiring90 = contracts.filter((c) => c.endDate > next60 && c.endDate <= next90);

    const complianceRecords = await this.prisma.complianceRecord.findMany({
      where: { communityId },
      include: { vendor: { select: { name: true } } },
    });

    const expiringCompliance = complianceRecords.filter((r) => {
      if (!r.expiryDate) return false;
      return r.expiryDate <= next30 || r.status === 'EXPIRING_SOON';
    });

    const insuranceExpiring = complianceRecords.filter((r) => {
      if (!r.expiryDate) return false;
      return (r.documentType.toLowerCase().includes('insurance')) && (r.expiryDate <= next30);
    });

    return {
      contractsExpiringIn30Days: expiring30,
      contractsExpiringIn60Days: expiring60,
      contractsExpiringIn90Days: expiring90,
      complianceExpiring: expiringCompliance,
      insuranceExpiring,
    };
  }

  /**
   * Cron Job Handler to generate alerts automatically
   * Note: This would typically be triggered by @Cron() but is kept as a callable service method
   */
  async generateAlerts() {
    this.logger.log('Running background job: generateAlerts for Contract renewals and compliance');
    // For a multi-tenant environment, we iterate over all active communities
    const communities = await this.prisma.community.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    for (const community of communities) {
      // Temporarily mock tenant context
      (this.tenantContext as any).communityId = community.id;
      
      const dashboardData = await this.getDashboardData();
      
      if (dashboardData.contractsExpiringIn30Days.length > 0) {
        // Logic to dispatch notifications (email/push) to COMMUNITY_ADMIN
        this.logger.log(`Community ${community.id}: ${dashboardData.contractsExpiringIn30Days.length} contracts expiring in 30 days.`);
      }
      
      if (dashboardData.complianceExpiring.length > 0) {
        this.logger.log(`Community ${community.id}: ${dashboardData.complianceExpiring.length} compliance documents expiring.`);
      }
    }
  }
}
