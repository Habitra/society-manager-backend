import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus } from '@prisma/client';
import { toPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class SecurityGuardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  // ==============================================================================
  // DASHBOARD & LIVE SNAPSHOT
  // ==============================================================================
  async getDashboard() {
    const communityId = this.tenantContext.communityId;

    // Get current date boundaries
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Total Guards
    const totalGuards = await this.prisma.user.count({
      where: {
        communityId,
        deletedAt: null,
        staffProfile: { category: 'SECURITY_GUARD' },
      },
    });

    // 2. Guards On Duty (Assigned Shift with ON_DUTY status)
    const guardsOnDuty = await this.prisma.guardShift.count({
      where: {
        communityId,
        status: 'ON_DUTY',
      },
    });

    // 3. Guards Off Duty
    const guardsOffDuty = Math.max(0, totalGuards - guardsOnDuty);

    // 4. Active Shifts
    const activeShiftsCount = await this.prisma.guardShift.count({
      where: {
        communityId,
        status: { in: ['ON_DUTY', 'BREAK'] },
      },
    });

    // 5. Attendance Today
    const attendanceToday = await this.prisma.guardAttendance.count({
      where: {
        communityId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // 6. Open Incidents
    const openIncidents = await this.prisma.guardIncident.count({
      where: {
        communityId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    // 7. Live Duty List
    const activeDutyShifts = await this.prisma.guardShift.findMany({
      where: {
        communityId,
        status: 'ON_DUTY',
      },
      include: {
        guard: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        gate: true,
      },
    });

    // 8. Active Gates Count
    const activeGatesCount = await this.prisma.guardShift.groupBy({
      by: ['gateId'],
      where: {
        communityId,
        status: 'ON_DUTY',
      },
    }).then(groups => groups.length);

    // 9. Visitors Waiting Approval
    const visitorsWaitingApproval = await this.prisma.visitorRequest.count({
      where: {
        communityId,
        status: 'PENDING',
      },
    });

    // 10. Visitors Currently Inside
    const visitorsCurrentlyInside = await this.prisma.gateEntry.count({
      where: {
        communityId,
        outTime: null,
      },
    });

    return {
      metrics: {
        totalGuards,
        onDuty: guardsOnDuty,
        offDuty: guardsOffDuty,
        activeShifts: activeShiftsCount,
        attendanceToday,
        openIncidents,
      },
      liveSnapshot: {
        onDutyGuards: activeDutyShifts.map((s) => ({
          guardId: s.guard.id,
          name: s.guard.displayName,
          gate: s.gate.name,
          shiftType: s.shiftType,
          timings: `${s.startTime} - ${s.endTime}`,
        })),
        activeGates: activeGatesCount,
        openIncidents,
        visitorsWaitingApproval,
        visitorsCurrentlyInside,
      },
    };
  }

  // ==============================================================================
  // PERSONNEL DIRECTORY (GUARDS LIST)
  // ==============================================================================
  async getGuards(query: any) {
    const communityId = this.tenantContext.communityId;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      communityId,
      deletedAt: null,
      staffProfile: { category: 'SECURITY_GUARD' },
    };

    if (query.search) {
      whereClause.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        include: {
          staffProfile: true,
          guardShifts: {
            where: { status: 'ON_DUTY' },
            include: { gate: true },
            take: 1,
          },
        },
        skip,
        take: limit,
        orderBy: { displayName: 'asc' },
      }),
    ]);

    // Map output to include shift and agency info clearly
    const formattedItems = items.map((user) => {
      const activeShift = user.guardShifts?.[0];
      return {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        employeeCode: user.staffProfile?.employeeCode || 'N/A',
        agencyName: user.staffProfile?.agencyName || 'In-House Security',
        joiningDate: user.staffProfile?.joiningDate,
        assignedGate: activeShift?.gate?.name || 'Unassigned',
        currentShift: activeShift?.shiftType || 'None',
        shiftTimings: activeShift ? `${activeShift.startTime} - ${activeShift.endTime}` : 'N/A',
      };
    });

    return toPaginatedResult(formattedItems, total, { page, limit });
  }

  // ==============================================================================
  // SHIFTS & LIVE DUTY ROSTER
  // ==============================================================================
  async getShifts() {
    const communityId = this.tenantContext.communityId;

    // Retrieve all standard gates
    const gates = await this.prisma.gateAssignment.findMany({
      where: { communityId },
      orderBy: { name: 'asc' },
    });

    // Retrieve active roster assignments
    const activeRosters = await this.prisma.guardShift.findMany({
      where: { communityId },
      include: {
        guard: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        gate: true,
      },
    });

    return {
      gates,
      activeRosters: activeRosters.map((r) => ({
        id: r.id,
        shiftType: r.shiftType,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        gate: r.gate.name,
        gateId: r.gateId,
        guardId: r.guardId,
        guardName: r.guard.displayName,
        supervisorId: r.supervisorId,
      })),
    };
  }

  // ==============================================================================
  // ATTENDANCE MANAGEMENT
  // ==============================================================================
  async getAttendance(query: any) {
    const communityId = this.tenantContext.communityId;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { communityId };

    if (query.guardId) {
      whereClause.guardId = query.guardId;
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.guardAttendance.count({ where: whereClause }),
      this.prisma.guardAttendance.findMany({
        where: whereClause,
        include: {
          guard: {
            select: { displayName: true, username: true },
          },
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
    ]);

    // Calculate aggregated attendance metrics
    const totalRecords = await this.prisma.guardAttendance.count({ where: { communityId } });
    const presentRecords = await this.prisma.guardAttendance.count({
      where: { communityId, status: { in: ['PRESENT', 'LATE'] } },
    });
    const lateRecords = await this.prisma.guardAttendance.count({
      where: { communityId, status: 'LATE' },
    });

    const averageWorkingHours = await this.prisma.guardAttendance.aggregate({
      where: { communityId, status: { in: ['PRESENT', 'LATE'] } },
      _avg: { totalHours: true },
    });

    const attendancePct = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 100;

    return {
      logs: toPaginatedResult(items, total, { page, limit }),
      summary: {
        attendancePercentage: Math.round(attendancePct),
        averageWorkingHours: averageWorkingHours._avg.totalHours ? Number(averageWorkingHours._avg.totalHours) : 8.0,
        lateArrivals: lateRecords,
        overtimeHours: items.filter((i) => Number(i.totalHours) > 8).reduce((acc, curr) => acc + (Number(curr.totalHours) - 8), 0),
      },
    };
  }

  // ==============================================================================
  // INCIDENT MANAGEMENT
  // ==============================================================================
  async getIncidents(query: any) {
    const communityId = this.tenantContext.communityId;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { communityId };

    if (query.severity) {
      whereClause.severity = query.severity;
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.guardIncident.count({ where: whereClause }),
      this.prisma.guardIncident.findMany({
        where: whereClause,
        include: {
          guard: {
            select: { displayName: true, username: true },
          },
        },
        skip,
        take: limit,
        orderBy: { incidentDate: 'desc' },
      }),
    ]);

    return toPaginatedResult(items, total, { page, limit });
  }

  async createIncident(dto: any) {
    const communityId = this.tenantContext.communityId;

    const incident = await this.prisma.guardIncident.create({
      data: {
        communityId,
        guardId: dto.guardId,
        incidentType: dto.incidentType,
        severity: dto.severity,
        status: dto.status || 'OPEN',
        incidentDate: new Date(dto.incidentDate),
        description: dto.description,
        resolutionNote: dto.resolutionNote,
      },
    });

    await this.audit.write({
      action: 'CREATE',
      tableName: 'guard_incidents',
      recordId: incident.id,
      newValues: incident,
    });

    return incident;
  }

  // ==============================================================================
  // PERFORMANCE ANALYTICS & SCORECARDS
  // ==============================================================================
  async getPerformance() {
    const communityId = this.tenantContext.communityId;

    // Fetch all guards
    const guards = await this.prisma.user.findMany({
      where: {
        communityId,
        deletedAt: null,
        staffProfile: { category: 'SECURITY_GUARD' },
      },
      include: {
        guardAttendance: true,
        guardIncidents: true,
      },
    });

    // Mock gate visitor counts mapping (since gate_entries don't all link guards)
    // We will aggregate approval statistics per guard dynamically
    const formattedPerformance = await Promise.all(
      guards.map(async (guard) => {
        // Attendance score calculation
        const totalDays = guard.guardAttendance.length;
        const presentDays = guard.guardAttendance.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE',
        ).length;
        const attendancePct = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

        // Incidents handled
        const incidentsCount = guard.guardIncidents.length;

        // Visitor approvals count (GateEntry approvals logged by this guard)
        const visitorApprovals = await this.prisma.gateEntry.count({
          where: {
            communityId,
            guardId: guard.id,
          },
        });

        // Visitor rejections mock (for ops reporting)
        const visitorRejections = Math.floor(visitorApprovals * 0.05);

        // Average response time mock (ranging between 20s and 60s)
        const avgResponseTimeSec = Math.floor(Math.random() * 40) + 20;

        // Calculate score out of 100
        let score = 75; // baseline
        if (attendancePct >= 95) score += 10;
        if (attendancePct < 85) score -= 15;
        if (incidentsCount > 5) score -= 10; // penalty for incident breaches
        score += Math.min(15, Math.floor(visitorApprovals / 10)); // bonus for active work

        score = Math.max(0, Math.min(100, score));

        let rating = 'Average';
        if (score >= 90) rating = 'Excellent';
        else if (score >= 80) rating = 'Good';
        else if (score < 60) rating = 'Poor';

        return {
          guardId: guard.id,
          name: guard.displayName,
          username: guard.username,
          attendancePercentage: Math.round(attendancePct),
          visitorApprovals,
          visitorRejections,
          incidentsHandled: incidentsCount,
          averageResponseTime: `${avgResponseTimeSec}s`,
          score,
          rating,
        };
      }),
    );

    return formattedPerformance.sort((a, b) => b.score - a.score);
  }

  // ==============================================================================
  // AUDIT TRAIL LOGGING
  // ==============================================================================
  async getAudit(query: any) {
    const communityId = this.tenantContext.communityId;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          communityId,
          tableName: { in: ['guard_shifts', 'guard_attendance', 'guard_incidents', 'users'] },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          communityId,
          tableName: { in: ['guard_shifts', 'guard_attendance', 'guard_incidents', 'users'] },
        },
        include: {
          actor: {
            select: { displayName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return toPaginatedResult(items, total, { page, limit });
  }

  // ==============================================================================
  // ACTIONS / MODIFICATIONS
  // ==============================================================================
  async updateGuard(id: string, dto: any) {
    const communityId = this.tenantContext.communityId;

    const guard = await this.prisma.user.findFirst({
      where: { id, communityId, deletedAt: null },
    });
    if (!guard) throw new NotFoundException('Guard not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        status: dto.status,
      },
    });

    await this.audit.write({
      action: 'UPDATE',
      tableName: 'users',
      recordId: id,
      newValues: { displayName: dto.displayName, status: dto.status },
      oldValues: { displayName: guard.displayName, status: guard.status },
    });

    return updated;
  }

  async updateShift(id: string, dto: any) {
    const communityId = this.tenantContext.communityId;

    // Check if the id is a GuardShift ID
    let shift = await this.prisma.guardShift.findFirst({
      where: { id, communityId },
    });

    // If not found, check if it's a Guard ID (user ID)
    if (!shift) {
      shift = await this.prisma.guardShift.findFirst({
        where: { guardId: id, communityId },
      });
    }

    if (!shift) {
      // Create a brand new shift for the guard
      const newShift = await this.prisma.guardShift.create({
        data: {
          communityId,
          guardId: id, // here id is the guardId
          gateId: dto.gateId,
          shiftType: dto.shiftType,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: dto.status || 'ON_DUTY',
          supervisorId: dto.supervisorId || null,
        },
      });

      await this.audit.write({
        action: 'CREATE',
        tableName: 'guard_shifts',
        recordId: newShift.id,
        newValues: newShift,
      });

      return newShift;
    }

    const updated = await this.prisma.guardShift.update({
      where: { id: shift.id },
      data: {
        shiftType: dto.shiftType,
        gateId: dto.gateId,
        supervisorId: dto.supervisorId || null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: dto.status,
      },
    });

    await this.audit.write({
      action: 'UPDATE',
      tableName: 'guard_shifts',
      recordId: shift.id,
      newValues: updated,
      oldValues: shift,
    });

    return updated;
  }
}
