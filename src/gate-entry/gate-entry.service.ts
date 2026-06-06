// src/gate-entry/gate-entry.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VisitorRequestStatus } from '@prisma/client';
import { GateEntryRepository } from './gate-entry.repository';
import { GatePassService } from '../gate-pass/gate-pass.service';
import { VisitorRepository } from '../visitor/visitor.repository';
import { RecordEntryDto } from './dto/record-entry.dto';
import { GateEntryResponseDto } from './dto/gate-entry-response.dto';

@Injectable()
export class GateEntryService {
  constructor(
    private readonly gateEntryRepository: GateEntryRepository,
    private readonly gatePassService: GatePassService,
    private readonly visitorRepository: VisitorRepository,
  ) {}

  async recordEntry(dto: RecordEntryDto, guardId: string): Promise<GateEntryResponseDto> {
    if (!dto.gatePassId && !dto.visitorRequestId) {
      throw new BadRequestException('Must provide either gatePassId or visitorRequestId');
    }

    let passId = dto.gatePassId;
    let reqId = dto.visitorRequestId;

    if (passId) {
      // Validate that pass is actually valid and active
      // In a real flow, the guard scans the QR, which calls GatePassService.validatePass.
      // We assume it's valid if they pass the ID, but let's do a quick check anyway.
      const pass = await this.gatePassService.validatePass(passId); // if invalid, it throws
      reqId = pass.visitorRequestId;
    }

    if (reqId) {
      const visitorReq = await this.visitorRepository.findById(reqId);
      if (!visitorReq) {
        throw new NotFoundException('Visitor request not found');
      }

      if (visitorReq.status !== VisitorRequestStatus.APPROVED) {
        throw new BadRequestException('Cannot enter: Visitor request is not APPROVED');
      }

      // Check if already entered
      const activeEntry = await this.gateEntryRepository.findActiveEntryByVisitor(reqId);
      if (activeEntry) {
        throw new BadRequestException('Visitor has already entered and not exited.');
      }

      // Create entry
      const entry = await this.gateEntryRepository.create({
        visitorRequestId: reqId,
        gatePassId: passId,
        guardId,
        visitorName: dto.visitorName,
        vehicleNumber: dto.vehicleNumber,
        isVehicleEntry: dto.isVehicleEntry ?? false,
        inTime: new Date(),
      });

      // Update visitor status
      await this.visitorRepository.update(reqId, { status: VisitorRequestStatus.ENTERED });

      return entry as unknown as GateEntryResponseDto;
    }

    throw new BadRequestException('Invalid entry data');
  }

  async recordExit(id: string, guardId: string): Promise<GateEntryResponseDto> {
    const entry = await this.gateEntryRepository.findById(id);
    
    if (!entry) {
      throw new NotFoundException('Gate entry not found');
    }

    if (entry.outTime) {
      throw new BadRequestException('Exit already recorded for this entry.');
    }

    const updated = await this.gateEntryRepository.update(id, { outTime: new Date() });

    if (updated.visitorRequestId) {
      await this.visitorRepository.update(updated.visitorRequestId as string, { status: VisitorRequestStatus.EXITED });
    }

    return updated as unknown as GateEntryResponseDto;
  }
}
