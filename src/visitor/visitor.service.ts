// src/visitor/visitor.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditAction, VisitorEntryMode, VisitorRequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { VisitorRepository } from './visitor.repository';
import { GatePassService } from '../gate-pass/gate-pass.service';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import { VisitorRequestResponseDto } from './dto/visitor-request-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { toPaginatedResult, toPrismaPage } from '../common/utils/pagination.util';
import { ListVisitorsDto } from './dto/list-visitors.dto';

@Injectable()
export class VisitorService {
  constructor(
    private readonly visitorRepository: VisitorRepository,
    private readonly gatePassService: GatePassService,
    private readonly auditService: AuditService,
  ) {}

  async createRequest(dto: CreateVisitorRequestDto, actorId: string): Promise<VisitorRequestResponseDto> {
    const isPreApproved = dto.entryMode === VisitorEntryMode.PRE_APPROVED;
    const initialStatus = isPreApproved ? VisitorRequestStatus.APPROVED : VisitorRequestStatus.PENDING;

    let responseDeadline = undefined;
    if (dto.entryMode === VisitorEntryMode.ON_ARRIVAL) {
      // e.g. 5 minutes timeout for ON_ARRIVAL
      responseDeadline = new Date(Date.now() + 5 * 60 * 1000); 
    }

    const request = await this.visitorRepository.create({
      unitId: dto.unitId,
      requestedById: actorId, // resident or guard
      visitorName: dto.visitorName,
      visitorPhone: dto.visitorPhone,
      vehicleNumber: dto.vehicleNumber,
      visitorType: dto.visitorType,
      entryMode: dto.entryMode,
      status: initialStatus,
      purpose: dto.purpose,
      validFrom: dto.validFrom,
      validUntil: dto.validUntil,
      responseDeadline,
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'visitor_requests',
      recordId: request.id as string,
    });

    if (isPreApproved) {
      const expiry = dto.validUntil ?? new Date(new Date(dto.validFrom).getTime() + 24 * 60 * 60 * 1000); // Default 1 day
      await this.gatePassService.generatePass(request.id as string, expiry);
    }

    return request as unknown as VisitorRequestResponseDto;
  }

  async getRequestById(id: string): Promise<VisitorRequestResponseDto> {
    const request = await this.visitorRepository.findById(id);
    if (!request) {
      throw new NotFoundException(`Visitor request '${id}' not found.`);
    }
    return request as unknown as VisitorRequestResponseDto;
  }

  async listAllVisitors(dto: ListVisitorsDto) {
    const { skip, take } = toPrismaPage(dto);
    const where: any = {};

    if (dto.search) {
      where.OR = [
        { visitorName: { contains: dto.search, mode: 'insensitive' } },
        { visitorPhone: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.status) where.status = dto.status;
    if (dto.entryMode) where.entryMode = dto.entryMode;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    const [requests, total] = await Promise.all([
      this.visitorRepository.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { gatePass: true },
      }),
      this.visitorRepository.count({ where })
    ]);

    return toPaginatedResult(requests as unknown as VisitorRequestResponseDto[], total, dto);
  }

  async listResidentRequests(userId: string, dto: PaginationDto) {
    const { skip, take } = toPrismaPage(dto);

    const [requests, total] = await Promise.all([
      this.visitorRepository.findMany({
        where: { requestedById: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { gatePass: true },
      }),
      this.visitorRepository.count({
        where: { requestedById: userId },
      })
    ]);

    return toPaginatedResult(requests as unknown as VisitorRequestResponseDto[], total, dto);
  }

  async approveOnArrival(id: string, actorId: string): Promise<VisitorRequestResponseDto> {
    const request = await this.visitorRepository.findById(id);
    if (request.status !== VisitorRequestStatus.PENDING && request.status !== VisitorRequestStatus.VIEWED) {
      throw new BadRequestException('Request is not in a state to be approved.');
    }

    const updated = await this.visitorRepository.update(id, { status: VisitorRequestStatus.APPROVED });
    
    // Generate pass immediately upon approval
    const expiry = request.validUntil ? new Date(request.validUntil as string) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.gatePassService.generatePass(id, expiry);

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'visitor_requests',
      recordId: id,
      newValues: { status: VisitorRequestStatus.APPROVED },
    });

    return updated as unknown as VisitorRequestResponseDto;
  }

  async rejectOnArrival(id: string, actorId: string): Promise<VisitorRequestResponseDto> {
    const request = await this.visitorRepository.findById(id);
    if (request.status !== VisitorRequestStatus.PENDING && request.status !== VisitorRequestStatus.VIEWED) {
      throw new BadRequestException('Request is not in a state to be rejected.');
    }

    const updated = await this.visitorRepository.update(id, { status: VisitorRequestStatus.REJECTED });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'visitor_requests',
      recordId: id,
      newValues: { status: VisitorRequestStatus.REJECTED },
    });

    return updated as unknown as VisitorRequestResponseDto;
  }

  async deleteRequest(id: string, actorId: string): Promise<{ success: boolean }> {
    const request = await this.visitorRepository.findById(id);
    if (!request) {
      throw new NotFoundException(`Visitor request '${id}' not found.`);
    }

    // Usually we do a soft delete or just delete
    // Wait, visitorRepository doesn't have delete out of the box, let's use Prisma directly
    // Wait, visitorRepository might have `delete` or `update`.
    // Let's just update the status to CANCELLED or soft delete it by updating deletedAt if it exists.
    // The schema has `deletedAt: null` in the `listAllVisitors` return signature.
    await this.visitorRepository.update(id, { deletedAt: new Date() });

    void this.auditService.write({
      actorId,
      action: AuditAction.DELETE,
      tableName: 'visitor_requests',
      recordId: id,
    });

    return { success: true };
  }
}
