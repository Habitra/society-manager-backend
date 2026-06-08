import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MaintenanceRepository } from './maintenance.repository';
import { ResidentAssignmentRepository } from '../resident-assignment/resident-assignment.repository';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { AuditService } from '../audit/audit.service';
import { toPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly maintenanceRepository: MaintenanceRepository,
    private readonly residentAssignmentRepository: ResidentAssignmentRepository,
    private readonly auditService: AuditService,
  ) {}

  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear().toString();
    const sequenceType = `TICKET_${year}`;

    const sequence = await this.prisma.usernameSequence.upsert({
      where: {
        communityId_userType: {
          communityId: this.tenantContext.communityId,
          userType: sequenceType,
        },
      },
      update: { nextValue: { increment: 1 } },
      create: {
        communityId: this.tenantContext.communityId,
        userType: sequenceType,
        nextValue: 2,
      },
    });

    const val = sequence.nextValue - 1;
    return `CMP-${year}-${val.toString().padStart(6, '0')}`;
  }

  async createTicket(dto: CreateTicketDto) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User ID not found in context');

    const assignments = await this.residentAssignmentRepository.findByUser(userId);
    const primaryAssignment = assignments.find(a => a.isPrimary) || assignments[0];

    if (!primaryAssignment) {
      throw new BadRequestException('User is not assigned to any unit.');
    }

    const category = await this.prisma.maintenanceCategory.findFirst({
      where: { id: dto.categoryId, communityId: this.tenantContext.communityId },
    });

    if (!category) {
      throw new NotFoundException('Maintenance category not found');
    }

    const ticketNumber = await this.generateTicketNumber();

    const snapshot = {
      occupancyType: primaryAssignment.occupancyType,
      unitId: primaryAssignment.unitId,
      towerId: primaryAssignment.unit.towerId,
      createdByUserId: userId,
    };

    const ticket = await this.maintenanceRepository.create({
      ticketNumber,
      categoryId: dto.categoryId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || 'MEDIUM',
      status: 'OPEN',
      unitId: primaryAssignment.unitId,
      raisedById: userId,
      metadata: snapshot,
    });

    return { ...ticket, snapshot: ticket.metadata };
  }

  async getMyTickets(dto: ListTicketsDto) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User ID not found in context');
    return this.listTickets(dto, userId);
  }

  async listTickets(dto: ListTicketsDto, specificUserId?: string) {
    const page = dto.page ? Number(dto.page) : 1;
    const limit = dto.limit ? Number(dto.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (specificUserId) where.raisedById = specificUserId;

    if (dto.search) {
      where.OR = [
        { ticketNumber: { contains: dto.search, mode: 'insensitive' } },
        { title: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.status) where.status = dto.status;
    if (dto.priority) where.priority = dto.priority;
    if (dto.categoryId) where.categoryId = dto.categoryId;

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    const [items, total] = await Promise.all([
      this.maintenanceRepository.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.maintenanceRepository.count({ where }),
    ]);

    const formattedItems = items.map(item => ({ ...item, snapshot: item.metadata }));
    return toPaginatedResult(formattedItems, total, dto);
  }

  async getTicketById(id: string, specificUserId?: string) {
    const ticket = await this.maintenanceRepository.findById(id) as any;
    if (specificUserId && ticket.raisedById !== specificUserId) {
      throw new ForbiddenException('You can only view your own tickets.');
    }
    return { ...ticket, snapshot: ticket.metadata };
  }

  async updateTicketStatus(id: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.maintenanceRepository.findById(id) as any;
    
    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      OPEN: ['IN_PROGRESS'],
      IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
      ON_HOLD: ['IN_PROGRESS'],
      RESOLVED: ['REOPENED', 'CLOSED'],
      REOPENED: ['IN_PROGRESS'],
      CLOSED: [],
    };

    const currentStatus = ticket.status as TicketStatus;
    const newStatus = dto.status;

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    const updateData: any = { status: newStatus };
    if (newStatus === 'RESOLVED') updateData.resolvedAt = new Date();
    else if (newStatus === 'CLOSED') updateData.closedAt = new Date();

    const updatedTicket = await this.maintenanceRepository.update(id, updateData) as any;
    return { ...updatedTicket, snapshot: updatedTicket.metadata };
  }

  async assignTicket(id: string, dto: AssignTicketDto) {
    const ticket = await this.maintenanceRepository.findById(id) as any;
    const adminId = this.tenantContext.userId;

    const staffProfile = await this.prisma.staffProfile.findFirst({
      where: {
        userId: dto.staffId,
        communityId: this.tenantContext.communityId,
        user: { status: 'ACTIVE' },
        deletedAt: null,
      },
    });

    if (!staffProfile) {
      throw new BadRequestException('Invalid or inactive staff member');
    }

    const isReassignment = !!ticket.assignedToId;
    const assignedAt = new Date();

    const updatedTicket = await this.maintenanceRepository.update(id, {
      assignedToId: dto.staffId,
      assignedById: adminId,
      assignedAt,
    }) as any;

    await this.auditService.write({
      action: AuditAction.UPDATE,
      tableName: 'maintenance_tickets',
      recordId: id,
      actorId: adminId,
      communityId: this.tenantContext.communityId,
      newValues: { assignedToId: dto.staffId, assignedById: adminId, assignedAt },
      metadata: { event: isReassignment ? 'REASSIGNMENT' : 'ASSIGNMENT' },
    });

    return {
      ticketId: updatedTicket.id,
      assignedStaff: dto.staffId,
      assignedAt,
    };
  }

  async getTicketTimeline(id: string) {
    const ticket = await this.maintenanceRepository.findById(id) as any;

    const timeline = [];
    timeline.push({ type: 'CREATED', timestamp: ticket.createdAt, data: null });

    const [comments, attachments, auditLogs] = await Promise.all([
      this.prisma.maintenanceComment.findMany({
        where: { ticketId: id, deletedAt: null },
      }),
      this.prisma.maintenanceAttachment.findMany({
        where: { ticketId: id },
      }),
      this.prisma.auditLog.findMany({
        where: { tableName: 'maintenance_tickets', recordId: id },
      }),
    ]);

    for (const comment of comments) {
      timeline.push({ type: 'COMMENT_ADDED', timestamp: comment.createdAt, data: { commentId: comment.id, body: comment.body, isInternal: comment.isInternal } });
    }

    for (const attachment of attachments) {
      timeline.push({ type: 'ATTACHMENT_UPLOADED', timestamp: attachment.createdAt, data: { attachmentId: attachment.id, fileName: attachment.fileName } });
    }

    for (const log of auditLogs) {
      const metadata = log.metadata as Record<string, any> || {};
      if (metadata.event === 'ASSIGNMENT') {
        timeline.push({ type: 'ASSIGNED', timestamp: log.createdAt, data: { assignedToId: (log.newValues as any)?.assignedToId } });
      } else if (metadata.event === 'REASSIGNMENT') {
        timeline.push({ type: 'REASSIGNED', timestamp: log.createdAt, data: { assignedToId: (log.newValues as any)?.assignedToId } });
      } else if (log.newValues && (log.newValues as any).status && log.oldValues && (log.oldValues as any).status !== (log.newValues as any).status) {
        const newStatus = (log.newValues as any).status;
        if (newStatus === 'RESOLVED') {
          timeline.push({ type: 'RESOLVED', timestamp: log.createdAt, data: null });
        } else if (newStatus === 'CLOSED') {
          timeline.push({ type: 'CLOSED', timestamp: log.createdAt, data: null });
        } else {
          timeline.push({ type: 'STATUS_CHANGED', timestamp: log.createdAt, data: { from: (log.oldValues as any).status, to: newStatus } });
        }
      }
    }

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return timeline;
  }

  // Dashboard Support Services
  async getOpenTicketsCount() {
    return this.maintenanceRepository.count({ where: { status: 'OPEN' } });
  }

  async getInProgressTicketsCount() {
    return this.maintenanceRepository.count({ where: { status: 'IN_PROGRESS' } });
  }

  async getResolvedTicketsCount() {
    return this.maintenanceRepository.count({ where: { status: 'RESOLVED' } });
  }

  async getClosedTicketsCount() {
    return this.maintenanceRepository.count({ where: { status: 'CLOSED' } });
  }

  async getRecentTickets(limit: number = 20) {
    return this.maintenanceRepository.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTicketsByCategory() {
    return this.prisma.maintenanceTicket.groupBy({
      by: ['categoryId'],
      where: { communityId: this.tenantContext.communityId, deletedAt: null },
      _count: { id: true },
    });
  }

  async getTicketsByPriority() {
    return this.prisma.maintenanceTicket.groupBy({
      by: ['priority'],
      where: { communityId: this.tenantContext.communityId, deletedAt: null },
      _count: { id: true },
    });
  }

  // ==============================================================================
  // STAFF INTEGRATION
  // ==============================================================================

  async getAssignedTicketsCount(staffId: string): Promise<number> {
    return this.prisma.maintenanceTicket.count({
      where: { assignedToId: staffId, deletedAt: null },
    });
  }

  async getOpenAssignedTicketsCount(staffId: string): Promise<number> {
    return this.prisma.maintenanceTicket.count({
      where: {
        assignedToId: staffId,
        deletedAt: null,
        status: { notIn: ['CLOSED', 'RESOLVED'] },
      },
    });
  }

  async getTicketsForStaff(staffId: string) {
    return this.prisma.maintenanceTicket.findMany({
      where: { assignedToId: staffId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        unit: { include: { tower: true } },
        category: true,
      },
    });
  }
}
