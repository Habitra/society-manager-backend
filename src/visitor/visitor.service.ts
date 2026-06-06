// src/visitor/visitor.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditAction, VisitorEntryMode, VisitorRequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { VisitorRepository } from './visitor.repository';
import { GatePassService } from '../gate-pass/gate-pass.service';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import { VisitorRequestResponseDto } from './dto/visitor-request-response.dto';

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

  async listResidentRequests(userId: string): Promise<VisitorRequestResponseDto[]> {
    // List all requests created by this resident or targeted at their unit
    const requests = await this.visitorRepository.findMany({
      where: { requestedById: userId },
      orderBy: { createdAt: 'desc' },
      include: { gatePass: true },
    });
    return requests as unknown as VisitorRequestResponseDto[];
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
}
