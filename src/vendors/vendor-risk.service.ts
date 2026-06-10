import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class VendorRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Calculates and updates the Risk Level for a given vendor based on:
   * 1. Compliance (e.g. Expired Documents)
   * 2. SLA Breaches
   * 3. Security Incidents
   * 4. Resident Complaints
   * 5. Contract Issues (e.g., terminated contracts)
   */
  async evaluateAndSetRiskLevel(vendorId: string) {
    const communityId = this.tenantContext.communityId;

    let riskScore = 0; // Higher is worse

    // 1. Compliance Issues
    const complianceRecords = await this.prisma.complianceRecord.findMany({
      where: { communityId, vendorId },
    });

    complianceRecords.forEach((record) => {
      if (record.status === 'EXPIRED' || record.status === 'MISSING') {
        riskScore += 20; // High risk for non-compliance
      } else if (record.status === 'EXPIRING_SOON') {
        riskScore += 5;
      }
    });

    // 2. SLA Breaches & Security Incidents
    const metrics = await this.prisma.vendorPerformanceMetric.findMany({
      where: { communityId, vendorId },
    });

    metrics.forEach((metric) => {
      if (metric.metricType === 'SECURITY_INCIDENT') {
        riskScore += 30; // Critical
      } else if (metric.metricType === 'SLA_BREACH') {
        riskScore += 10;
      }
    });

    // 3. Resident Complaints (Low rating feedback)
    const feedbacks = await this.prisma.vendorFeedback.findMany({
      where: { communityId, vendorId, source: 'RESIDENT' },
    });

    feedbacks.forEach((fb) => {
      if (Number(fb.rating) <= 2) {
        riskScore += 5; // Complaint
      }
    });

    // 4. Contract Issues
    const contractRenewals = await this.prisma.contractRenewalHistory.findMany({
      where: { communityId, contract: { vendorId } },
    });

    contractRenewals.forEach((renewal) => {
      if (renewal.status === 'TERMINATED') {
        riskScore += 15;
      }
    });

    // Determine Risk Level Enum
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 50) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 30) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 10) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Update Vendor
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { riskLevel },
    });

    return {
      vendorId,
      riskScore,
      riskLevel,
    };
  }

  /**
   * Evaluate risk for all vendors
   */
  async evaluateAllVendors() {
    const communityId = this.tenantContext.communityId;
    const vendors = await this.prisma.vendor.findMany({
      where: { communityId, status: { not: 'BLACKLISTED' } },
      select: { id: true },
    });

    for (const vendor of vendors) {
      await this.evaluateAndSetRiskLevel(vendor.id);
    }
  }
}
