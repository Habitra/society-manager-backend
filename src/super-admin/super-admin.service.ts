import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SuperAdminRepository } from './super-admin.repository';
import { CreateCommunityAdminDto } from './dto/create-community-admin.dto';
import { generateTemporaryPassword } from './utils/password-generator.util';
import { generateCommunityAdminUsername } from './utils/username-generator.util';
import { AuditAction, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly auditService: AuditService,
  ) {}

  async getDashboardStats() {
    const [
      communities,
      activeCommunities,
      inactiveCommunities,
      towers,
      units,
      residents,
      communityAdmins,
    ] = await Promise.all([
      this.superAdminRepo.countCommunities(),
      this.superAdminRepo.countActiveCommunities(),
      this.superAdminRepo.countInactiveCommunities(),
      this.superAdminRepo.countTowers(),
      this.superAdminRepo.countUnits(),
      this.superAdminRepo.countResidents(),
      this.superAdminRepo.countCommunityAdmins(),
    ]);

    return {
      communities,
      activeCommunities,
      inactiveCommunities,
      towers,
      units,
      residents,
      communityAdmins,
    };
  }

  async getCommunities(skip: number, take: number, search?: string, status?: string) {
    const [items, total] = await this.superAdminRepo.getCommunities(
      skip,
      take,
      search,
      status,
    );

    return {
      items,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getCommunityDetails(id: string) {
    const community = await this.superAdminRepo.getCommunityById(id);
    if (!community) {
      throw new NotFoundException(`Community with id ${id} not found`);
    }

    const stats = await this.superAdminRepo.getCommunityStats(id);

    return {
      community,
      stats,
    };
  }

  async getCommunityStats(id: string) {
    const community = await this.superAdminRepo.getCommunityById(id);
    if (!community) {
      throw new NotFoundException(`Community with id ${id} not found`);
    }

    return this.superAdminRepo.getCommunityStats(id);
  }

  async activateCommunity(id: string, actorId: string) {
    const community = await this.superAdminRepo.getCommunityById(id);
    if (!community) {
      throw new NotFoundException(`Community with id ${id} not found`);
    }

    const updated = await this.superAdminRepo.updateCommunityStatus(id, 'ACTIVE');

    await this.auditService.write({
      communityId: id,
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'communities',
      recordId: id,
      oldValues: { status: community.status },
      newValues: { status: 'ACTIVE' },
    });

    return updated;
  }

  async deactivateCommunity(id: string, actorId: string) {
    const community = await this.superAdminRepo.getCommunityById(id);
    if (!community) {
      throw new NotFoundException(`Community with id ${id} not found`);
    }

    const updated = await this.superAdminRepo.updateCommunityStatus(id, 'SUSPENDED');

    await this.auditService.write({
      communityId: id,
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'communities',
      recordId: id,
      oldValues: { status: community.status },
      newValues: { status: 'SUSPENDED' },
    });

    return updated;
  }

  async createCommunityAdmin(dto: CreateCommunityAdminDto, actorId: string) {
    const community = await this.superAdminRepo.getCommunityById(dto.communityId);
    if (!community) {
      throw new NotFoundException(`Community with id ${dto.communityId} not found`);
    }

    if (!community.code) {
      throw new BadRequestException(`Community does not have a code configured`);
    }

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const userType = 'COMMUNITY_ADMIN';
    const displayName = `${dto.firstName} ${dto.lastName}`.trim();

    return this.prisma.$transaction(async (tx) => {
      // 1. Manage Sequence safely
      const sequence = await tx.usernameSequence.upsert({
        where: {
          communityId_userType: {
            communityId: dto.communityId,
            userType,
          },
        },
        create: {
          communityId: dto.communityId,
          userType,
          nextValue: 2,
        },
        update: {
          nextValue: { increment: 1 },
        },
      });

      const nextVal = sequence.nextValue - 1; // Since we incremented it or it defaulted to 2
      const username = generateCommunityAdminUsername(community.code, nextVal);

      // 2. Create User
      const user = await tx.user.create({
        data: {
          communityId: dto.communityId,
          role: UserRole.COMMUNITY_ADMIN,
          status: 'ACTIVE',
          username,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          displayName,
          firstLoginCompleted: false,
          mustChangePassword: true,
          adminProfile: {
            create: {
              communityId: dto.communityId,
              permissions: [],
            },
          },
        },
      });

      // 3. Create Audit Log (doing directly via tx to ensure atomicity, or use service if it supports tx. But AuditService uses this.prisma internally. We must write directly using tx)
      await tx.auditLog.create({
        data: {
          communityId: dto.communityId,
          actorId,
          action: AuditAction.CREATE,
          tableName: 'users',
          recordId: user.id,
          newValues: { username, role: UserRole.COMMUNITY_ADMIN },
        },
      });

      return {
        username,
        temporaryPassword: tempPassword,
      };
    });
  }

  async getCommunityAdmins(skip: number, take: number, search?: string, communityId?: string) {
    const [items, total] = await this.superAdminRepo.getCommunityAdmins(skip, take, search, communityId);
    return {
      items,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getCommunityAdminDetails(id: string) {
    const admin = await this.superAdminRepo.getCommunityAdminById(id);
    if (!admin) {
      throw new NotFoundException(`Community Admin with id ${id} not found`);
    }
    return admin;
  }

  async resetCommunityAdminPassword(id: string, actorId: string) {
    const admin = await this.superAdminRepo.getCommunityAdminById(id);
    if (!admin) {
      throw new NotFoundException(`Community Admin with id ${id} not found`);
    }

    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        firstLoginCompleted: false,
      },
    });

    await this.auditService.write({
      communityId: admin.communityId,
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { mustChangePassword: true, firstLoginCompleted: false },
      metadata: { reason: 'Password reset by Super Admin' },
    });

    return {
      username: admin.username,
      temporaryPassword: tempPassword,
    };
  }

  async getAuditLogs(skip: number, take: number, search?: string, action?: string) {
    const where: any = {};
    if (action) {
      where.action = action;
    }
    if (search) {
      where.OR = [
        { tableName: { contains: search, mode: 'insensitive' } },
        { actor: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        userId: log.actorId,
        userType: log.actor?.role || 'SYSTEM',
        username: log.actor?.username || log.actor?.displayName,
        action: log.action,
        entityName: log.tableName,
        entityId: log.recordId,
        details: log.newValues || log.oldValues || log.metadata || {},
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}

