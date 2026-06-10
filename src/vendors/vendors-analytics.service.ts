import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class VendorsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Retrieves overall vendor spend analytics
   */
  async getVendorSpendAnalytics(startDate?: Date, endDate?: Date) {
    const communityId = this.tenantContext.communityId;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // Total spend based on SUCCESS vendor payments
    const totalSpendResult = await this.prisma.vendorPayment.aggregate({
      where: {
        communityId,
        paymentStatus: 'SUCCESS',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Spend by Vendor
    const spendByVendor = await this.prisma.vendorPayment.groupBy({
      by: ['vendorId'],
      where: {
        communityId,
        paymentStatus: 'SUCCESS',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    const vendorIds = spendByVendor.map((v) => v.vendorId);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true, category: true },
    });

    const topCostVendors = spendByVendor
      .map((spend) => {
        const vendor = vendors.find((v) => v.id === spend.vendorId);
        return {
          vendorId: spend.vendorId,
          vendorName: vendor?.name || 'Unknown',
          category: vendor?.category || 'Unknown',
          totalSpend: Number(spend._sum.amount || 0),
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return {
      totalSpend: Number(totalSpendResult._sum.amount || 0),
      topCostVendors: topCostVendors.slice(0, 10), // Top 10 by default
    };
  }

  /**
   * Outstanding payments calculation
   */
  async getOutstandingVendorPayments() {
    const communityId = this.tenantContext.communityId;

    const outstanding = await this.prisma.vendorPayment.aggregate({
      where: {
        communityId,
        paymentStatus: 'PENDING',
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalOutstandingAmount: Number(outstanding._sum.amount || 0),
      outstandingInvoiceCount: outstanding._count.id,
    };
  }

  /**
   * Contract Utilization Analytics
   */
  async getContractUtilization() {
    const communityId = this.tenantContext.communityId;

    const activeContracts = await this.prisma.contract.findMany({
      where: {
        communityId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        vendorId: true,
        contractNumber: true,
        value: true,
        payments: {
          where: { paymentStatus: 'SUCCESS' },
          select: { amount: true },
        },
        vendor: {
          select: { name: true },
        },
      },
    });

    return activeContracts.map((contract) => {
      const totalPaid = contract.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
      const utilizationPercentage =
        Number(contract.value) > 0
          ? (totalPaid / Number(contract.value)) * 100
          : 0;

      return {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        vendorName: contract.vendor.name,
        contractValue: Number(contract.value),
        totalPaid,
        utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      };
    });
  }

  /**
   * ROI and Cost Per Ticket Analytics
   */
  async getVendorCostMetrics() {
    const communityId = this.tenantContext.communityId;

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        communityId,
        status: 'COMPLETED',
        cost: { not: null },
      },
      include: {
        vendor: { select: { name: true, category: true } },
      },
    });

    const vendorStats = new Map<string, { totalCost: number; ticketCount: number; name: string }>();

    let totalCostAll = 0;
    let totalTicketsAll = workOrders.length;

    workOrders.forEach((wo) => {
      const cost = Number(wo.cost || 0);
      totalCostAll += cost;

      const current = vendorStats.get(wo.vendorId) || { totalCost: 0, ticketCount: 0, name: wo.vendor.name };
      vendorStats.set(wo.vendorId, {
        totalCost: current.totalCost + cost,
        ticketCount: current.ticketCount + 1,
        name: current.name,
      });
    });

    const vendorCostPerTicket = Array.from(vendorStats.entries()).map(([vendorId, stats]) => ({
      vendorId,
      vendorName: stats.name,
      totalCost: stats.totalCost,
      ticketCount: stats.ticketCount,
      costPerTicket: stats.ticketCount > 0 ? parseFloat((stats.totalCost / stats.ticketCount).toFixed(2)) : 0,
    }));

    const globalCostPerTicket =
      totalTicketsAll > 0 ? parseFloat((totalCostAll / totalTicketsAll).toFixed(2)) : 0;

    return {
      globalCostPerTicket,
      totalCompletedWorkOrders: totalTicketsAll,
      vendorCostPerTicket: vendorCostPerTicket.sort((a, b) => b.costPerTicket - a.costPerTicket),
    };
  }
}
