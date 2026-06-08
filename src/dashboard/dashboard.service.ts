import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AnnouncementService } from '../announcement/announcement.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';
import { MaintenanceDashboardDto } from './dto/maintenance-dashboard.dto';
import { VisitorDashboardDto } from './dto/visitor-dashboard.dto';
import { OccupancyDashboardDto } from './dto/occupancy-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly maintenanceService: MaintenanceService,
    private readonly announcementService: AnnouncementService,
  ) {}

  async getOverviewMetrics(): Promise<DashboardOverviewDto> {
    const communityId = this.tenantContext.communityId;

    const [
      totalResidents,
      activeResidents,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      openTickets,
      resolvedTickets
    ] = await Promise.all([
      this.prisma.user.count({ where: { communityId, role: 'RESIDENT', deletedAt: null } }),
      this.prisma.user.count({ where: { communityId, role: 'RESIDENT', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.unit.count({ where: { communityId, deletedAt: null } }),
      this.prisma.unit.count({ where: { communityId, occupancy: { not: 'VACANT' }, deletedAt: null } }),
      this.prisma.unit.count({ where: { communityId, occupancy: 'VACANT', deletedAt: null } }),
      this.maintenanceService.getOpenTicketsCount(),
      this.maintenanceService.getResolvedTicketsCount(),
    ]);

    // Calculate today's visitors
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const totalVisitorsToday = await this.prisma.gateEntry.count({
      where: {
        communityId,
        inTime: { gte: startOfToday, lte: endOfToday },
      },
    });

    const userAnnouncements = await this.announcementService.findMyFeed(communityId, this.tenantContext.userId!, 'COMMUNITY_ADMIN' as any);

    return {
      totalResidents,
      activeResidents,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      totalVisitorsToday,
      openTickets,
      resolvedTickets,
      unreadAnnouncementsCount: userAnnouncements.filter(a => !a.isRead).length,
      recentAnnouncements: userAnnouncements.slice(0, 5),
      pinnedAnnouncements: userAnnouncements.filter(a => a.isPinned),
    };
  }

  async getMaintenanceMetrics(): Promise<MaintenanceDashboardDto> {
    const [
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      ticketsByCategoryRaw,
      ticketsByPriorityRaw,
    ] = await Promise.all([
      this.maintenanceService.getOpenTicketsCount(),
      this.maintenanceService.getInProgressTicketsCount(),
      this.maintenanceService.getResolvedTicketsCount(),
      this.maintenanceService.getClosedTicketsCount(),
      this.maintenanceService.getTicketsByCategory(),
      this.maintenanceService.getTicketsByPriority(),
    ]);

    return {
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      ticketsByCategory: ticketsByCategoryRaw,
      ticketsByPriority: ticketsByPriorityRaw,
    };
  }

  async getVisitorMetrics(): Promise<VisitorDashboardDto> {
    const communityId = this.tenantContext.communityId;
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      expectedVisitorsToday,
      checkedInVisitors,
      checkedOutVisitors,
      activeGatePasses,
      expiredGatePasses,
    ] = await Promise.all([
      this.prisma.visitorRequest.count({
        where: {
          communityId,
          validFrom: { lte: endOfToday },
          validUntil: { gte: startOfToday },
          deletedAt: null,
        },
      }),
      this.prisma.gateEntry.count({
        where: {
          communityId,
          inTime: { gte: startOfToday, lte: endOfToday },
          outTime: null,
        },
      }),
      this.prisma.gateEntry.count({
        where: {
          communityId,
          inTime: { gte: startOfToday, lte: endOfToday },
          outTime: { not: null },
        },
      }),
      this.prisma.gatePass.count({
        where: {
          communityId,
          status: { in: ['PENDING', 'APPROVED'] },
          expiresAt: { gt: now },
          deletedAt: null,
        },
      }),
      this.prisma.gatePass.count({
        where: {
          communityId,
          expiresAt: { lte: now },
          deletedAt: null,
        },
      }),
    ]);

    return {
      expectedVisitorsToday,
      checkedInVisitors,
      checkedOutVisitors,
      activeGatePasses,
      expiredGatePasses,
    };
  }

  async getOccupancyMetrics(): Promise<OccupancyDashboardDto> {
    const communityId = this.tenantContext.communityId;

    const assignments = await this.prisma.residentUnitAssignment.groupBy({
      by: ['occupancyType'],
      where: { communityId, deletedAt: null },
      _count: { _all: true },
    });

    let ownerResidentsCount = 0;
    let tenantsCount = 0;
    let nonResidentOwnersCount = 0;

    for (const a of assignments) {
      if (a.occupancyType === 'OWNER_RESIDENT') ownerResidentsCount += a._count._all;
      else if (a.occupancyType === 'TENANT') tenantsCount += a._count._all;
      else if (a.occupancyType === 'OWNER_NON_RESIDENT') nonResidentOwnersCount += a._count._all;
    }

    return {
      ownerResidents: ownerResidentsCount,
      tenants: tenantsCount,
      nonResidentOwners: nonResidentOwnersCount,
    };
  }

  async getRecentActivity(limit: number = 20) {
    const communityId = this.tenantContext.communityId;

    const [recentTickets, recentGateEntries, recentResidents] = await Promise.all([
      this.maintenanceService.getRecentTickets(limit),
      this.prisma.gateEntry.findMany({
        where: { communityId },
        orderBy: { inTime: 'desc' },
        take: limit,
      }),
      this.prisma.user.findMany({
        where: { communityId, role: 'RESIDENT', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const activity: Array<{ type: string; timestamp: Date; data: any }> = [];

    for (const t of recentTickets) {
      activity.push({ type: 'TICKET_CREATED', timestamp: t.createdAt as Date, data: { ticketId: t.id, title: t.title, number: t.ticketNumber } });
    }

    for (const e of recentGateEntries) {
      activity.push({ type: 'VISITOR_ENTRY', timestamp: e.inTime, data: { entryId: e.id, visitorName: e.visitorName } });
    }

    for (const r of recentResidents) {
      activity.push({ type: 'RESIDENT_CREATED', timestamp: r.createdAt, data: { userId: r.id, name: r.displayName } });
    }

    activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activity.slice(0, limit);
  }

  async getRecentTickets(limit: number = 20) {
    return this.maintenanceService.getRecentTickets(limit);
  }
}
