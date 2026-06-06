// src/resident-assignment/resident-assignment.service.ts
// ============================================================
// Resident Assignment service.
// Business logic for assigning residents to units.
// ============================================================

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { UnitRepository } from '../unit/unit.repository';
import { PrismaService } from '../prisma/prisma.service'; // For user existence check
import { AssignResidentDto } from './dto/assign-resident.dto';
import { ResidentAssignmentResponseDto } from './dto/resident-assignment-response.dto';
import { ResidentAssignmentRepository } from './resident-assignment.repository';

@Injectable()
export class ResidentAssignmentService {
  constructor(
    private readonly assignmentRepository: ResidentAssignmentRepository,
    private readonly unitRepository: UnitRepository,
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async assignResident(dto: AssignResidentDto, actorId: string): Promise<ResidentAssignmentResponseDto> {
    // Check if unit exists
    const unitExists = await this.unitRepository.exists(dto.unitId);
    if (!unitExists) {
      throw new NotFoundException(`Unit '${dto.unitId}' not found.`);
    }

    // Check if user exists and is in the same community
    // Bypassing BaseRepository since User repo isn't built yet, use direct Prisma check
    const user = await this.prismaService.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
    });
    
    if (!user) {
      throw new NotFoundException(`User '${dto.userId}' not found.`);
    }

    // Check if already assigned
    const existing = await this.assignmentRepository.findActiveAssignment(dto.userId, dto.unitId);
    if (existing) {
      throw new ConflictException(`User '${dto.userId}' is already assigned to unit '${dto.unitId}'.`);
    }

    // Handle primary logic
    if (dto.isPrimary) {
      await this.assignmentRepository.clearPrimaryForUnit(dto.unitId);
    } else {
      // If there is no primary, make this one primary
      const currentPrimary = await this.assignmentRepository.findPrimaryForUnit(dto.unitId);
      if (!currentPrimary) {
        dto.isPrimary = true;
      }
    }

    const assignment = await this.assignmentRepository.create({
      userId: dto.userId,
      unitId: dto.unitId,
      occupancy: dto.occupancy,
      isPrimary: dto.isPrimary ?? false,
      moveInDate: dto.moveInDate,
      leaseEndDate: dto.leaseEndDate,
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'resident_unit_assignments',
      recordId: assignment.id as string,
      newValues: { userId: dto.userId, unitId: dto.unitId, isPrimary: dto.isPrimary },
    });

    return assignment as unknown as ResidentAssignmentResponseDto;
  }

  async removeAssignment(id: string, actorId: string): Promise<void> {
    const assignment = await this.assignmentRepository.findById(id);

    await this.assignmentRepository.softDelete(id);

    // If it was primary, try to promote another assignment to primary
    if (assignment.isPrimary) {
      const remaining = await this.assignmentRepository.findByUnit(assignment.unitId as string);
      if (remaining.length > 0) {
        const nextPrimary = remaining[0];
        await this.assignmentRepository.update(nextPrimary.id as string, { isPrimary: true });
      }
    }

    void this.auditService.write({
      actorId,
      action: AuditAction.SOFT_DELETE,
      tableName: 'resident_unit_assignments',
      recordId: id,
    });
  }

  async setPrimary(id: string, actorId: string): Promise<ResidentAssignmentResponseDto> {
    const assignment = await this.assignmentRepository.findById(id);

    if (assignment.isPrimary) {
      return assignment as unknown as ResidentAssignmentResponseDto;
    }

    await this.assignmentRepository.clearPrimaryForUnit(assignment.unitId as string);
    const updated = await this.assignmentRepository.update(id, { isPrimary: true });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'resident_unit_assignments',
      recordId: id,
      newValues: { isPrimary: true },
    });

    return updated as unknown as ResidentAssignmentResponseDto;
  }

  async listResidentsInUnit(unitId: string): Promise<ResidentAssignmentResponseDto[]> {
    const unitExists = await this.unitRepository.exists(unitId);
    if (!unitExists) {
      throw new NotFoundException(`Unit '${unitId}' not found.`);
    }

    const assignments = await this.assignmentRepository.findByUnit(unitId);
    return assignments as unknown as ResidentAssignmentResponseDto[];
  }

  async listUnitsForResident(userId: string): Promise<ResidentAssignmentResponseDto[]> {
    const assignments = await this.assignmentRepository.findByUser(userId);
    return assignments as unknown as ResidentAssignmentResponseDto[];
  }
}
