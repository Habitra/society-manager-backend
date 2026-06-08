import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceCommentRepository } from './maintenance-comment.repository';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { MaintenanceRepository } from './maintenance.repository';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceCommentService {
  constructor(
    private readonly commentRepository: MaintenanceCommentRepository,
    private readonly ticketRepository: MaintenanceRepository,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  private async validateTicketAccess(ticketId: string, userId: string, role: string) {
    const ticket = await this.ticketRepository.findById(ticketId) as any;
    if (role === 'RESIDENT' || role === 'FAMILY_MEMBER') {
      if (ticket.raisedById !== userId) throw new ForbiddenException('Cannot access this ticket');
    } else if (role === 'STAFF') {
      if (ticket.assignedToId !== userId) throw new ForbiddenException('Not assigned to this ticket');
    }
    return ticket;
  }

  async createComment(ticketId: string, dto: CreateCommentDto, role: string) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User not authenticated');

    await this.validateTicketAccess(ticketId, userId, role);

    const isResident = role === 'RESIDENT' || role === 'FAMILY_MEMBER';
    if (isResident && dto.isInternal) {
      throw new ForbiddenException('Residents cannot create internal comments');
    }

    return this.commentRepository.create({
      ticketId,
      authorId: userId,
      body: dto.comment,
      isInternal: dto.isInternal || false,
    });
  }

  async getComments(ticketId: string, role: string) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User not authenticated');

    await this.validateTicketAccess(ticketId, userId, role);

    const isResident = role === 'RESIDENT' || role === 'FAMILY_MEMBER';
    
    const where: any = { ticketId };
    if (isResident) {
      where.isInternal = false;
    }

    return this.commentRepository.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateComment(id: string, dto: UpdateCommentDto, role: string) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User not authenticated');

    const comment = await this.commentRepository.findById(id) as any;
    const isAdmin = role === 'COMMUNITY_ADMIN' || role === 'SUPER_ADMIN';

    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Cannot edit this comment');
    }

    if (dto.comment !== undefined) {
      return this.commentRepository.update(id, { body: dto.comment });
    }
    return comment;
  }

  async deleteComment(id: string, role: string) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User not authenticated');

    const comment = await this.commentRepository.findById(id) as any;
    const isAdmin = role === 'COMMUNITY_ADMIN' || role === 'SUPER_ADMIN';

    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    return this.commentRepository.softDelete(id);
  }
}
