import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { VendorCategory, VendorStatus, ContractStatus, WorkOrderStatus, ComplianceStatus, RiskLevel } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get communityId() {
    return this.tenantContext.communityId;
  }

  async getDashboardMetrics() {
    const cid = this.communityId;
    
    const [
      activeVendors,
      expiringContracts,
      openWorkOrders,
      complianceIssues,
      costAnalytics
    ] = await Promise.all([
      this.prisma.vendor.count({ where: { communityId: cid, status: VendorStatus.ACTIVE } }),
      this.prisma.contract.count({
        where: {
          communityId: cid,
          status: ContractStatus.ACTIVE,
          endDate: { lte: new Date(new Date().setDate(new Date().getDate() + 30)) }
        }
      }),
      this.prisma.workOrder.count({
        where: { communityId: cid, status: { in: [WorkOrderStatus.CREATED, WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.IN_PROGRESS] } }
      }),
      this.prisma.complianceRecord.count({
        where: { communityId: cid, status: { in: [ComplianceStatus.EXPIRING_SOON, ComplianceStatus.EXPIRED, ComplianceStatus.MISSING] } }
      }),
      this.getCostAnalytics()
    ]);

    return {
      activeVendors,
      contractsExpiring: expiringContracts,
      monthlyVendorSpend: costAnalytics.currentMonthSpend,
      openWorkOrders,
      complianceIssues,
      averageVendorRating: 4.5, // placeholder derived from performance
    };
  }

  async getCostAnalytics() {
    const cid = this.communityId;
    // Real implementation would calculate based on payments this month
    // Using simple aggregations for now
    
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0,0,0,0);
    
    const spendAggregation = await this.prisma.vendorPayment.aggregate({
      where: {
        communityId: cid,
        paymentDate: { gte: currentMonthStart },
        paymentStatus: 'SUCCESS'
      },
      _sum: {
        amount: true
      }
    });

    const outstandingPayments = await this.prisma.vendorPayment.aggregate({
      where: {
        communityId: cid,
        paymentStatus: 'PENDING'
      },
      _sum: {
        amount: true
      }
    });

    return {
      currentMonthSpend: spendAggregation._sum.amount || 0,
      outstandingPayments: outstandingPayments._sum.amount || 0,
      categorySpend: [],
      spendTrend: []
    };
  }

  async getVendors(query: any) {
    return this.prisma.vendor.findMany({
      where: { communityId: this.communityId },
      include: {
        _count: {
          select: { contracts: true, workOrders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getContracts() {
    return this.prisma.contract.findMany({
      where: { communityId: this.communityId },
      include: { vendor: true },
      orderBy: { endDate: 'asc' }
    });
  }

  async getWorkOrders() {
    return this.prisma.workOrder.findMany({
      where: { communityId: this.communityId },
      include: { vendor: true, ticket: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getComplianceRecords() {
    return this.prisma.complianceRecord.findMany({
      where: { communityId: this.communityId },
      include: { vendor: true },
      orderBy: { expiryDate: 'asc' }
    });
  }

  async getPayments() {
    return this.prisma.vendorPayment.findMany({
      where: { communityId: this.communityId },
      include: { vendor: true, contract: true },
      orderBy: { paymentDate: 'desc' }
    });
  }

  async getBlacklist() {
    return this.prisma.vendor.findMany({
      where: { communityId: this.communityId, status: VendorStatus.BLACKLISTED },
      include: { admin: true }
    });
  }

  async getRenewalIntelligence() {
    const cid = this.communityId;
    const now = new Date();
    const thirtyDays = new Date(now.setDate(now.getDate() + 30));
    const sixtyDays = new Date(now.setDate(now.getDate() + 30));
    const ninetyDays = new Date(now.setDate(now.getDate() + 30));

    const contracts = await this.prisma.contract.findMany({
      where: { communityId: cid, status: ContractStatus.ACTIVE },
      include: { vendor: true }
    });

    return {
      expiringIn30: contracts.filter(c => c.endDate <= thirtyDays),
      expiringIn60: contracts.filter(c => c.endDate > thirtyDays && c.endDate <= sixtyDays),
      expiringIn90: contracts.filter(c => c.endDate > sixtyDays && c.endDate <= ninetyDays),
    };
  }
}
