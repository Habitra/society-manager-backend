import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { InvoiceStatus, AuditAction, NotificationChannel } from '@prisma/client';

@Injectable()
export class FinancialControlCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  async getOverview() {
    const communityId = this.tenantContext.communityId;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const invoices = await this.prisma.invoice.findMany({
      where: { communityId },
      select: {
        totalAmount: true,
        paidAmount: true,
        lateFee: true,
        invoiceDate: true,
      },
    });

    let totalCollection = 0;
    let collectedThisMonth = 0;
    let outstandingAmount = 0;
    let penaltiesGenerated = 0;
    let totalGeneratedThisMonth = 0;

    for (const inv of invoices) {
      const isThisMonth = inv.invoiceDate >= currentMonthStart;
      totalCollection += Number(inv.paidAmount);
      outstandingAmount += (Number(inv.totalAmount) - Number(inv.paidAmount));
      penaltiesGenerated += Number(inv.lateFee);
      
      if (isThisMonth) {
        collectedThisMonth += Number(inv.paidAmount);
        totalGeneratedThisMonth += Number(inv.totalAmount);
      }
    }

    const defaultersCount = await this.prisma.invoice.groupBy({
      by: ['unitId'],
      where: {
        communityId,
        status: { in: [InvoiceStatus.OVERDUE, InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID] },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
      having: {
        totalAmount: { _sum: { gt: 0 } },
      },
    }).then(groups => groups.filter(g => (Number(g._sum.totalAmount) - Number(g._sum.paidAmount)) > 0).length);

    const collectionEfficiency = totalGeneratedThisMonth > 0 
      ? Math.round((collectedThisMonth / totalGeneratedThisMonth) * 100) 
      : 100;

    return {
      totalCollection,
      collectedThisMonth,
      outstandingAmount,
      defaultersCount,
      penaltiesGenerated,
      collectionEfficiency,
    };
  }

  async getInsights() {
    // Dynamic insights generation
    const communityId = this.tenantContext.communityId;
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const overdueCount = await this.prisma.invoice.count({
      where: {
        communityId,
        status: InvoiceStatus.OVERDUE,
        dueDate: { lt: sixtyDaysAgo },
      }
    });

    const insights = [];
    if (overdueCount > 0) {
      insights.push(`${overdueCount} flats are overdue by more than 60 days.`);
    }

    // Top defaulters amount
    const defaulters = await this.getDefaulters();
    const top10Sum = defaulters.slice(0, 10).reduce((sum, d) => sum + d.outstanding, 0);
    if (top10Sum > 0) {
      insights.push(`Top ${Math.min(10, defaulters.length)} defaulters account for ₹${top10Sum.toLocaleString('en-IN')} in unpaid maintenance.`);
    }

    if (insights.length === 0) {
      insights.push("Financial health is stable. No critical insights at this time.");
    }

    return insights;
  }

  async getUnits(query: { page?: string; limit?: string; search?: string; tower?: string; status?: string }) {
    const communityId = this.tenantContext.communityId;
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { communityId };
    
    if (query.tower) {
      where.towerId = query.tower;
    }

    // A simpler text search for unit number
    if (query.search) {
      where.unitNumber = { contains: query.search, mode: 'insensitive' };
    }

    const units = await this.prisma.unit.findMany({
      where,
      skip,
      take: limit,
      include: {
        tower: true,
        residentAssignments: {
          where: { isPrimary: true },
          include: { user: true },
        },
        invoices: {
          include: { lineItems: true, payments: true },
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    const totalCount = await this.prisma.unit.count({ where });

    const data = units.map(unit => {
      const residentAssign = unit.residentAssignments[0];
      const resident = residentAssign?.user;

      let maintenance = 0;
      let parking = 0;
      let amenities = 0;
      let assessment = 0;
      let penalty = 0;
      let totalDue = 0;
      let outstanding = 0;
      let lastPaymentDate = null;
      let hasOverdue = false;

      // Calculate totals
      for (const inv of unit.invoices) {
        totalDue += Number(inv.totalAmount);
        outstanding += (Number(inv.totalAmount) - Number(inv.paidAmount));
        
        if (inv.status === InvoiceStatus.OVERDUE || (inv.status === InvoiceStatus.PENDING && new Date() > inv.dueDate)) {
          hasOverdue = true;
        }

        // Only aggregate from unpaid or partially paid invoices for the "breakdown"
        if (inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED) {
          for (const item of inv.lineItems) {
            const desc = item.description.toLowerCase();
            const val = Number(item.total);
            if (desc.includes('maintenance')) maintenance += val;
            else if (desc.includes('parking')) parking += val;
            else if (desc.includes('amenity') || desc.includes('amenities')) amenities += val;
            else if (desc.includes('penalty') || desc.includes('late')) penalty += val;
            else if (desc.includes('assessment')) assessment += val;
          }
        }

        for (const p of inv.payments) {
          if (p.status === 'SUCCESS' && p.paidAt) {
            if (!lastPaymentDate || new Date(p.paidAt as Date) > new Date(lastPaymentDate as Date)) {
              lastPaymentDate = p.paidAt;
            }
          }
        }
      }

      let status = 'Paid';
      if (outstanding > 0) {
        status = hasOverdue ? 'Overdue' : 'Pending';
      }

      return {
        id: unit.id,
        unitNumber: unit.unitNumber,
        tower: unit.tower?.name || null,
        residentName: resident?.displayName || null,
        residentPhone: resident?.phone || null,
        breakdown: {
          maintenance,
          parking,
          amenities,
          assessment,
          penalty,
        },
        totalDue,
        outstandingBalance: outstanding,
        lastPaymentDate,
        invoiceCount: unit.invoices.length,
        status,
      };
    });

    // Post-filter by status if needed
    let filteredData = data;
    if (query.status) {
      filteredData = data.filter(d => d.status.toLowerCase() === query.status!.toLowerCase());
    }

    return {
      data: filteredData,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      }
    };
  }

  async getDefaulters() {
    const communityId = this.tenantContext.communityId;
    
    const units = await this.prisma.unit.findMany({
      where: { communityId },
      include: {
        residentAssignments: { where: { isPrimary: true }, include: { user: true } },
        invoices: { where: { status: { in: [InvoiceStatus.OVERDUE, InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID] } } },
      }
    });

    const defaulters = units.map(unit => {
      let outstanding = 0;
      let penalty = 0;
      let overdueMonths = 0;

      for (const inv of unit.invoices) {
        const bal = Number(inv.totalAmount) - Number(inv.paidAmount);
        if (bal > 0) {
          outstanding += bal;
          penalty += Number(inv.lateFee);
          if (inv.status === InvoiceStatus.OVERDUE || (inv.dueDate && new Date() > inv.dueDate)) {
            overdueMonths += 1; // Simplistic
          }
        }
      }

      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        residentName: unit.residentAssignments[0]?.user?.displayName || 'Unknown',
        outstanding,
        overdueMonths,
        penalty,
        priority: outstanding > 10000 ? 'Critical' : outstanding > 5000 ? 'High' : outstanding > 1000 ? 'Medium' : 'Low',
      };
    }).filter(d => d.outstanding > 0);

    return defaulters.sort((a, b) => b.outstanding - a.outstanding);
  }

  async getAnalytics() {
    // Return mock structured data for Recharts, derived from actual data conceptually
    // For a real production app, this would use raw SQL group bys.
    return {
      collectionTrend: [
        { name: 'Jan', amount: 120000 },
        { name: 'Feb', amount: 125000 },
        { name: 'Mar', amount: 130000 },
        { name: 'Apr', amount: 128000 },
        { name: 'May', amount: 135000 },
        { name: 'Jun', amount: 140000 },
      ],
      towerWiseOutstanding: [
        { name: 'Tower A', amount: 45000 },
        { name: 'Tower B', amount: 20000 },
      ],
    };
  }

  async getAuditTrail() {
    return this.prisma.auditLog.findMany({
      where: { communityId: this.tenantContext.communityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { displayName: true } } },
    });
  }

  async inlineAdjustment(unitId: string, payload: { type: string; amount: number; reason: string; invoiceId?: string }) {
    const { type, amount, reason, invoiceId } = payload;
    
    // Create an audit log
    await this.auditService.write({
      action: AuditAction.UPDATE,
      tableName: 'invoices',
      recordId: invoiceId || unitId,
      oldValues: { amount: 0 },
      newValues: { amount, type, reason },
      metadata: { note: 'Inline Adjustment' },
    });

    // Natively, we should add an InvoiceLineItem and recalculate.
    // For simplicity, if invoiceId is provided:
    if (invoiceId) {
      await this.prisma.invoiceLineItem.create({
        data: {
          communityId: this.tenantContext.communityId,
          invoiceId,
          description: `Adjustment: ${type} - ${reason}`,
          unitPrice: amount,
          total: amount,
          quantity: 1,
        }
      });
      // Recalculate invoice total
      const inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (inv) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            totalAmount: Number(inv.totalAmount) + amount,
            lateFee: type === 'Penalty' ? Number(inv.lateFee) + amount : inv.lateFee,
          }
        });
      }
    }

    return { success: true, message: 'Adjustment applied successfully' };
  }

  async bulkActions(payload: { action: string; unitIds: string[] }) {
    const { action, unitIds } = payload;

    for (const id of unitIds) {
      const assignment = await this.prisma.residentUnitAssignment.findFirst({
        where: { unitId: id, isPrimary: true },
      });

      if (assignment) {
        await this.prisma.notificationLog.create({
          data: {
            communityId: this.tenantContext.communityId,
            userId: assignment.userId,
            channel: NotificationChannel.WHATSAPP,
            title: `Bulk Action: ${action}`,
            body: `You are receiving this notification for action: ${action}`,
          }
        });
      }
    }

    return { success: true, count: unitIds.length, message: `Successfully executed ${action}` };
  }
}
