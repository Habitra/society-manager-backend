import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async getDashboard() {
    const communityId = this.tenantContext.communityId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [visitorsToday, deliveriesToday, activeVendors, currentlyInside, pendingApprovals, alerts] = await Promise.all([
      this.prisma.gateEntry.count({
        where: { communityId, inTime: { gte: todayStart }, visitorRequest: { visitorType: 'GUEST' } }
      }),
      this.prisma.gateEntry.count({
        where: { communityId, inTime: { gte: todayStart }, visitorRequest: { visitorType: { in: ['DELIVERY', 'COURIER'] } } }
      }),
      this.prisma.gateEntry.count({
        where: { communityId, inTime: { gte: todayStart }, visitorRequest: { visitorType: 'VENDOR' } }
      }),
      this.prisma.gateEntry.count({
        where: { communityId, outTime: null }
      }),
      this.prisma.visitorRequest.count({
        where: { communityId, status: 'PENDING' }
      }),
      this.getAlerts().then(res => res.length)
    ]);

    return {
      visitorsToday,
      deliveriesToday,
      activeVendors,
      currentlyInside,
      pendingApprovals,
      securityAlerts: alerts
    };
  }

  async getActivityFeed(page: number, limit: number) {
    const communityId = this.tenantContext.communityId;
    const skip = (page - 1) * limit;
    const entries = await this.prisma.gateEntry.findMany({
      where: { communityId },
      include: {
        visitorRequest: {
          include: { unit: true }
        },
        gatePass: true
      },
      orderBy: { inTime: 'desc' },
      skip,
      take: limit,
    });
    
    const total = await this.prisma.gateEntry.count({ where: { communityId } });
    return { data: entries, total, page, limit };
  }

  async getVisitors(search: string | undefined, page: number, limit: number) {
    const communityId = this.tenantContext.communityId;
    const skip = (page - 1) * limit;
    const whereClause: any = {
      communityId,
      visitorType: 'GUEST'
    };
    if (search) {
      whereClause.visitorName = { contains: search, mode: 'insensitive' };
    }

    const requests = await this.prisma.visitorRequest.findMany({
      where: whereClause,
      include: { unit: true, gateEntries: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.visitorRequest.count({ where: whereClause });
    return { data: requests, total, page, limit };
  }

  async getDeliveries(search: string | undefined, page: number, limit: number) {
    const communityId = this.tenantContext.communityId;
    const skip = (page - 1) * limit;
    const whereClause: any = {
      communityId,
      visitorType: { in: ['DELIVERY', 'COURIER'] }
    };
    if (search) {
      whereClause.visitorName = { contains: search, mode: 'insensitive' };
    }

    const requests = await this.prisma.visitorRequest.findMany({
      where: whereClause,
      include: { unit: true, gateEntries: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.visitorRequest.count({ where: whereClause });
    return { data: requests, total, page, limit };
  }

  async getVendors(search: string | undefined, page: number, limit: number) {
    const communityId = this.tenantContext.communityId;
    const skip = (page - 1) * limit;
    const whereClause: any = {
      communityId,
      visitorType: 'VENDOR'
    };
    if (search) {
      whereClause.visitorName = { contains: search, mode: 'insensitive' };
    }

    const requests = await this.prisma.visitorRequest.findMany({
      where: whereClause,
      include: { unit: true, gateEntries: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.visitorRequest.count({ where: whereClause });
    return { data: requests, total, page, limit };
  }

  async getServiceStaff(search: string | undefined, page: number, limit: number) {
    const communityId = this.tenantContext.communityId;
    const skip = (page - 1) * limit;
    const whereClause: any = {
      communityId,
      visitorType: { in: ['MAID', 'DRIVER', 'TECHNICIAN'] }
    };
    if (search) {
      whereClause.visitorName = { contains: search, mode: 'insensitive' };
    }

    const requests = await this.prisma.visitorRequest.findMany({
      where: whereClause,
      include: { unit: true, gateEntries: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.visitorRequest.count({ where: whereClause });
    return { data: requests, total, page, limit };
  }

  async getVehicles(search: string | undefined, page: number, limit: number) {
    const communityId = this.tenantContext.communityId;
    const skip = (page - 1) * limit;
    const whereClause: any = {
      communityId,
      isVehicleEntry: true
    };
    if (search) {
      whereClause.vehicleNumber = { contains: search, mode: 'insensitive' };
    }

    const entries = await this.prisma.gateEntry.findMany({
      where: whereClause,
      include: { visitorRequest: true },
      orderBy: { inTime: 'desc' },
      skip,
      take: limit,
    });
    const total = await this.prisma.gateEntry.count({ where: whereClause });
    return { data: entries, total, page, limit };
  }

  async getCurrentlyInside(type?: string) {
    const communityId = this.tenantContext.communityId;
    const whereClause: any = {
      communityId,
      outTime: null
    };

    if (type) {
      if (type === 'GUEST') whereClause.visitorRequest = { visitorType: 'GUEST' };
      else if (type === 'DELIVERY') whereClause.visitorRequest = { visitorType: { in: ['DELIVERY', 'COURIER'] } };
      else if (type === 'VENDOR') whereClause.visitorRequest = { visitorType: 'VENDOR' };
      else if (type === 'STAFF') whereClause.visitorRequest = { visitorType: { in: ['MAID', 'DRIVER', 'TECHNICIAN'] } };
    }

    const entries = await this.prisma.gateEntry.findMany({
      where: whereClause,
      include: {
        visitorRequest: { include: { unit: true } }
      },
      orderBy: { inTime: 'asc' }
    });

    return entries.map(entry => {
      const durationMs = new Date().getTime() - entry.inTime.getTime();
      return {
        ...entry,
        durationMinutes: Math.floor(durationMs / 60000)
      };
    });
  }

  async getEmergencyRollCall() {
    const communityId = this.tenantContext.communityId;
    const inside = await this.getCurrentlyInside();
    
    let visitors = 0, vendors = 0, deliveries = 0, staff = 0;
    inside.forEach(entry => {
      const type = entry.visitorRequest?.visitorType;
      if (type === 'GUEST') visitors++;
      else if (type === 'VENDOR') vendors++;
      else if (type === 'DELIVERY' || type === 'COURIER') deliveries++;
      else if (type === 'MAID' || type === 'DRIVER' || type === 'TECHNICIAN') staff++;
    });

    // We can also count active guards by checking staff_profiles
    const guards = await this.prisma.staffProfile.count({
      where: { communityId, category: 'SECURITY_GUARD', user: { status: 'ACTIVE' } } // Approximate
    });

    return { visitorsInside: visitors, vendorsInside: vendors, deliveriesInside: deliveries, staffInside: staff, guardsOnDuty: guards };
  }

  async getAlerts() {
    const communityId = this.tenantContext.communityId;
    const alerts: any[] = [];
    const now = new Date().getTime();

    // Find people inside for too long
    const inside = await this.prisma.gateEntry.findMany({
      where: { communityId, outTime: null },
      include: { visitorRequest: { include: { unit: true } } }
    });

    inside.forEach(entry => {
      const durationHours = (now - entry.inTime.getTime()) / (1000 * 60 * 60);
      const type = entry.visitorRequest?.visitorType;
      
      if ((type === 'DELIVERY' || type === 'COURIER') && durationHours > 1) {
        alerts.push({
          id: `alert-del-${entry.id}`,
          severity: 'MEDIUM',
          timestamp: entry.inTime,
          description: `${entry.visitorName} (Delivery) has been inside for over 1 hour.`,
          recommendedAction: `Contact Flat ${entry.visitorRequest?.unit?.unitNumber || 'Unknown'} to verify delivery completion.`
        });
      } else if (type === 'VENDOR' && durationHours > 12) {
        alerts.push({
          id: `alert-ven-${entry.id}`,
          severity: 'HIGH',
          timestamp: entry.inTime,
          description: `${entry.visitorName} (Vendor) has been inside for over 12 hours.`,
          recommendedAction: 'Dispatch guard to verify location and status.'
        });
      } else if ((type === 'GUEST') && durationHours > 24) {
        alerts.push({
          id: `alert-gst-${entry.id}`,
          severity: 'LOW',
          timestamp: entry.inTime,
          description: `${entry.visitorName} (Guest) has been inside for over 24 hours.`,
          recommendedAction: 'Check if they are staying overnight or if guard forgot to check them out.'
        });
      }
    });

    // Check watchlists matched recently (within last 24h)
    // For simplicity, we just return the ones we calculated.

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAnalytics() {
    const communityId = this.tenantContext.communityId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Peak hours
    const entries = await this.prisma.gateEntry.findMany({
      where: { communityId, inTime: { gte: thirtyDaysAgo } },
      select: { inTime: true, visitorRequest: { select: { unit: { select: { unitNumber: true, tower: { select: { name: true } } } } } } }
    });

    const hoursDistribution = Array(24).fill(0);
    const unitCounts: Record<string, number> = {};
    const towerCounts: Record<string, number> = {};

    entries.forEach(e => {
      hoursDistribution[e.inTime.getHours()]++;
      const unit = e.visitorRequest?.unit;
      if (unit) {
        unitCounts[unit.unitNumber] = (unitCounts[unit.unitNumber] || 0) + 1;
        if (unit.tower?.name) {
          towerCounts[unit.tower.name] = (towerCounts[unit.tower.name] || 0) + 1;
        }
      }
    });

    const peakHours = hoursDistribution.map((count, hour) => ({ name: `${hour}:00`, value: count }));
    const topFlats = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => ({ name: x[0], value: x[1] }));
    const topTowers = Object.entries(towerCounts).sort((a, b) => b[1] - a[1]).map(x => ({ name: x[0], value: x[1] }));

    return { peakHours, topFlats, topTowers };
  }

  async getGuardPerformance() {
    const communityId = this.tenantContext.communityId;
    const guards = await this.prisma.gateEntry.groupBy({
      by: ['guardId'],
      where: { communityId, guardId: { not: null } },
      _count: { _all: true }
    });

    const profiles = await this.prisma.user.findMany({
      where: { id: { in: guards.map(g => g.guardId as string) } },
      select: { id: true, displayName: true }
    });

    return guards.map(g => {
      const p = profiles.find(x => x.id === g.guardId);
      return {
        guardId: g.guardId,
        guardName: p?.displayName || 'Unknown Guard',
        entriesProcessed: g._count._all
      };
    });
  }

  async getWatchlist(search?: string) {
    const communityId = this.tenantContext.communityId;
    const where: any = { communityId };
    if (search) {
      where.entityValue = { contains: search, mode: 'insensitive' };
    }
    return this.prisma.securityWatchlist.findMany({ where, orderBy: { createdAt: 'desc' }, include: { addedBy: { select: { displayName: true } } } });
  }

  async addToWatchlist(userId: string, dto: any) {
    const communityId = this.tenantContext.communityId;
    return this.prisma.securityWatchlist.create({
      data: {
        communityId,
        addedById: userId,
        entityType: dto.entityType,
        entityValue: dto.entityValue,
        level: dto.level,
        reason: dto.reason
      }
    });
  }

  async updateWatchlist(id: string, dto: any) {
    const communityId = this.tenantContext.communityId;
    return this.prisma.securityWatchlist.update({
      where: { id, communityId },
      data: {
        level: dto.level,
        reason: dto.reason,
        isActive: dto.isActive
      }
    });
  }
}
