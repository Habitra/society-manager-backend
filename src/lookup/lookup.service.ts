import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { StaffCategory, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class LookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getTowers() {
    return this.prisma.tower.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getUnits(towerId?: string) {
    const where: any = {
      communityId: this.tenantContext.communityId,
      deletedAt: null,
    };
    if (towerId) {
      where.towerId = towerId;
    }

    return this.prisma.unit.findMany({
      where,
      select: {
        id: true,
        unitNumber: true,
      },
      orderBy: { unitNumber: 'asc' },
    });
  }

  async getStaff(category?: StaffCategory) {
    const where: any = {
      communityId: this.tenantContext.communityId,
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { in: [UserRole.STAFF, UserRole.MANAGER, UserRole.GUARD] },
    };

    if (category) {
      where.staffProfile = { category };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        staffProfile: {
          select: { category: true }
        }
      },
      orderBy: { displayName: 'asc' },
    }).then(users => users.map(u => ({
      id: u.id,
      displayName: u.displayName,
      staffCategory: u.staffProfile?.category
    })));
  }

  async getResidents() {
    const assignments = await this.prisma.residentUnitAssignment.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
        user: { status: UserStatus.ACTIVE, deletedAt: null }
      },
      select: {
        userId: true,
        user: { select: { displayName: true } },
        unit: { select: { unitNumber: true } }
      },
      orderBy: { user: { displayName: 'asc' } }
    });

    // Deduplicate or flat map
    const mapped = assignments.map(a => ({
      id: a.userId,
      displayName: a.user.displayName,
      unitNumber: a.unit.unitNumber
    }));

    return mapped;
  }
}
