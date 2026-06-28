import { randomBytes } from 'crypto';
import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { StaffProfileRepository, UserRepository } from './staff.repository';
import { AuditService } from '../audit/audit.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffDto } from './dto/list-staff.dto';
import { UserRole, UserStatus, StaffCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { toPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly staffRepo: StaffProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly audit: AuditService,
    private readonly maintenance: MaintenanceService,
  ) {}

  // ==============================================================================
  // CREATE STAFF
  // ==============================================================================

  async createStaff(dto: CreateStaffDto) {
    const communityId = this.tenantContext.communityId;

    let role: UserRole = UserRole.STAFF;
    if (dto.staffType === StaffCategory.SECURITY_GUARD) {
      role = UserRole.GUARD;
    } else if (dto.staffType === StaffCategory.MANAGER) {
      role = UserRole.MANAGER;
    }

    // Check email/phone uniqueness safely
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { communityId, email: dto.email, deletedAt: null },
      });
      if (existingEmail) throw new ConflictException('Email already in use');
    }

    const tempPassword = randomBytes(8).toString('hex'); // 16-char hex — crypto.randomBytes is CSPRNG-backed
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Generate Username (STF-000001)
    const seq = await this.getSequenceValue('STAFF');
    const username = `STF-${String(seq).padStart(6, '0')}`;

    const displayName = `${dto.firstName} ${dto.lastName}`.trim();

    const createdStaff = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          communityId,
          role,
          status: UserStatus.ACTIVE,
          username,
          email: dto.email || `${username.toLowerCase()}@example.com`,
          phone: dto.phone,
          passwordHash,
          displayName,
          mustChangePassword: true,
        },
      });

      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          communityId,
          category: dto.staffType,
        },
      });

      await this.incrementSequenceValue('STAFF');

      return { user, profile, tempPassword };
    });

    await this.audit.write({
      action: 'CREATE',
      tableName: 'users',
      recordId: createdStaff.user.id,
      newValues: { ...createdStaff.user, role: createdStaff.user.role },
    });

    return createdStaff;
  }

  // ==============================================================================
  // STAFF LISTING
  // ==============================================================================

  async listStaff(dto: ListStaffDto) {
    const communityId = this.tenantContext.communityId;

    const whereClause: any = {
      communityId,
      deletedAt: null,
      role: { in: [UserRole.STAFF, UserRole.GUARD, UserRole.MANAGER] },
    };

    if (dto.activeStatus) {
      whereClause.status = dto.activeStatus;
    }

    if (dto.staffType) {
      whereClause.staffProfile = { category: dto.staffType };
    }

    if (dto.search) {
      whereClause.OR = [
        { displayName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        include: { staffProfile: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return toPaginatedResult(items, total, dto);
  }

  // ==============================================================================
  // STAFF DETAILS
  // ==============================================================================

  async getStaffById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        communityId: this.tenantContext.communityId,
        deletedAt: null,
      },
      include: {
        staffProfile: true,
      },
    });

    if (!user || !user.staffProfile) throw new NotFoundException('Staff not found');

    const assignedTicketsCount = await this.maintenance.getAssignedTicketsCount(user.id);
    const openTicketsCount = await this.maintenance.getOpenAssignedTicketsCount(user.id);

    return {
      ...user,
      assignedTicketsCount,
      openTicketsCount,
    };
  }

  // ==============================================================================
  // ACTIVATE / DEACTIVATE
  // ==============================================================================

  async activateStaff(id: string) {
    return this.updateStaffStatus(id, UserStatus.ACTIVE);
  }

  async deactivateStaff(id: string) {
    return this.updateStaffStatus(id, UserStatus.INACTIVE);
  }

  private async updateStaffStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findFirst({
      where: { id, communityId: this.tenantContext.communityId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Staff not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    await this.audit.write({
      action: 'UPDATE',
      tableName: 'users',
      recordId: id,
      newValues: { status },
      oldValues: { status: user.status },
    });

    return updated;
  }

  // ==============================================================================
  // GUARD DIRECTORY
  // ==============================================================================

  async getGuards() {
    return this.prisma.user.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
        staffProfile: { category: StaffCategory.SECURITY_GUARD },
      },
      include: { staffProfile: true },
      orderBy: { displayName: 'asc' },
    });
  }

  // ==============================================================================
  // STAFF TICKETS
  // ==============================================================================

  async getStaffTickets(id: string) {
    // Basic delegation to maintenance service - or query directly
    return this.maintenance.getTicketsForStaff(id);
  }

  // ==============================================================================
  // DASHBOARD AGGREGATIONS
  // ==============================================================================

  async getTotalStaff() {
    return this.prisma.user.count({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
        role: { in: [UserRole.STAFF, UserRole.GUARD, UserRole.MANAGER] },
      },
    });
  }

  async getTotalGuards() {
    return this.prisma.user.count({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
        role: UserRole.GUARD,
      },
    });
  }

  async getActiveStaff() {
    return this.prisma.user.count({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: { in: [UserRole.STAFF, UserRole.GUARD, UserRole.MANAGER] },
      },
    });
  }

  async getInactiveStaff() {
    return this.prisma.user.count({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
        status: UserStatus.INACTIVE,
        role: { in: [UserRole.STAFF, UserRole.GUARD, UserRole.MANAGER] },
      },
    });
  }

  // Helpers

  private async getSequenceValue(type: string): Promise<number> {
    const communityId = this.tenantContext.communityId;
    const seq = await this.prisma.usernameSequence.findUnique({
      where: { communityId_userType: { communityId, userType: type } },
    });
    return seq ? seq.nextValue : 1;
  }

  private async incrementSequenceValue(type: string) {
    const communityId = this.tenantContext.communityId;
    await this.prisma.usernameSequence.upsert({
      where: { communityId_userType: { communityId, userType: type } },
      update: { nextValue: { increment: 1 } },
      create: { communityId, userType: type, nextValue: 2 },
    });
  }
}
