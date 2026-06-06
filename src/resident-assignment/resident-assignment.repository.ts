// src/resident-assignment/resident-assignment.repository.ts
// ============================================================
// Resident Assignment repository.
// Scoped to tenant via BaseRepository.
// ============================================================

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class ResidentAssignmentRepository extends BaseRepository<'residentUnitAssignment'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'residentUnitAssignment', tenantContext);
  }

  /**
   * Check if a user is currently assigned to a specific unit.
   */
  async findActiveAssignment(userId: string, unitId: string): Promise<Prisma.ResidentUnitAssignmentGetPayload<object> | null> {
    return this.findOne({
      userId,
      unitId,
      deletedAt: null,
    }) as Promise<Prisma.ResidentUnitAssignmentGetPayload<object> | null>;
  }

  /**
   * Find the current primary resident for a unit.
   */
  async findPrimaryForUnit(unitId: string): Promise<Prisma.ResidentUnitAssignmentGetPayload<object> | null> {
    return this.findOne({
      unitId,
      isPrimary: true,
      deletedAt: null,
    }) as Promise<Prisma.ResidentUnitAssignmentGetPayload<object> | null>;
  }

  /**
   * List all residents assigned to a specific unit.
   */
  async findByUnit(unitId: string): Promise<Prisma.ResidentUnitAssignmentGetPayload<{ include: { user: { select: { id: true, displayName: true, email: true, phone: true } } } }>[]> {
    return this.findMany({
      where: { unitId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<Prisma.ResidentUnitAssignmentGetPayload<{ include: { user: { select: { id: true, displayName: true, email: true, phone: true } } } }>[]>;
  }

  /**
   * List all units a specific resident is assigned to.
   */
  async findByUser(userId: string): Promise<Prisma.ResidentUnitAssignmentGetPayload<{ include: { unit: { include: { tower: true } } } }>[]> {
    return this.findMany({
      where: { userId },
      include: {
        unit: {
          include: {
            tower: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Prisma.ResidentUnitAssignmentGetPayload<{ include: { unit: { include: { tower: true } } } }>[]>;
  }

  /**
   * Mark all assignments for a unit as non-primary.
   * Useful before setting a new primary resident.
   */
  async clearPrimaryForUnit(unitId: string): Promise<void> {
    await this.prisma.residentUnitAssignment.updateMany({
      where: {
        communityId: this.communityId,
        unitId,
        isPrimary: true,
        deletedAt: null,
      },
      data: { isPrimary: false },
    });
  }
}
