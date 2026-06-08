import { ForbiddenException, Injectable } from '@nestjs/common';
import { MaintenanceAttachmentRepository } from './maintenance-attachment.repository';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { MaintenanceRepository } from './maintenance.repository';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class MaintenanceAttachmentService {
  constructor(
    private readonly attachmentRepository: MaintenanceAttachmentRepository,
    private readonly ticketRepository: MaintenanceRepository,
    private readonly tenantContext: TenantContextService,
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

  async addAttachment(ticketId: string, dto: CreateAttachmentDto, role: string) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User not authenticated');

    await this.validateTicketAccess(ticketId, userId, role);

    return this.attachmentRepository.create({
      ticketId,
      uploadedById: userId,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.fileType,
      fileUrl: 'pending-cloud-storage', // Dummy URL for MVP
    });
  }

  async getAttachments(ticketId: string, role: string) {
    const userId = this.tenantContext.userId;
    if (!userId) throw new ForbiddenException('User not authenticated');

    await this.validateTicketAccess(ticketId, userId, role);

    return this.attachmentRepository.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
