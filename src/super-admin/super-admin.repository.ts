import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Community, Prisma } from '@prisma/client';

@Injectable()
export class SuperAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // DASHBOARD AGGREGATES
  // ==========================================
  
  async countCommunities(): Promise<number> {
    return this.prisma.community.count({
      where: { deletedAt: null },
    });
  }

  async countActiveCommunities(): Promise<number> {
    return this.prisma.community.count({
      where: { status: 'ACTIVE', deletedAt: null },
    });
  }

  async countInactiveCommunities(): Promise<number> {
    return this.prisma.community.count({
      where: { status: { not: 'ACTIVE' }, deletedAt: null },
    });
  }

  async countTowers(): Promise<number> {
    return this.prisma.tower.count({
      where: { deletedAt: null },
    });
  }

  async countUnits(): Promise<number> {
    return this.prisma.unit.count({
      where: { deletedAt: null },
    });
  }

  async countResidents(): Promise<number> {
    return this.prisma.residentProfile.count({
      where: { deletedAt: null },
    });
  }

  async countCommunityAdmins(): Promise<number> {
    return this.prisma.adminProfile.count({
      where: { deletedAt: null },
    });
  }

  // ==========================================
  // COMMUNITIES
  // ==========================================

  async getCommunities(
    skip: number,
    take: number,
    search?: string,
    status?: string,
  ): Promise<[Community[], number]> {
    const where: Prisma.CommunityWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return Promise.all([
      this.prisma.community.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.community.count({ where }),
    ]);
  }

  async getCommunityById(id: string): Promise<Community | null> {
    return this.prisma.community.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async getCommunityStats(id: string) {
    const [towers, units, residents, staff, visitorsToday] = await Promise.all([
      this.prisma.tower.count({ where: { communityId: id, deletedAt: null } }),
      this.prisma.unit.count({ where: { communityId: id, deletedAt: null } }),
      this.prisma.residentProfile.count({ where: { communityId: id, deletedAt: null } }),
      this.prisma.staffProfile.count({ where: { communityId: id, deletedAt: null } }),
      this.prisma.gateEntry.count({
        where: {
          communityId: id,
          inTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return { towers, units, residents, staff, visitorsToday };
  }

  async updateCommunityStatus(id: string, status: any): Promise<Community> {
    return this.prisma.community.update({
      where: { id },
      data: { status },
    });
  }

  // ==========================================
  // COMMUNITY ADMINS
  // ==========================================

  async getCommunityAdmins(
    skip: number,
    take: number,
    search?: string,
    communityId?: string,
  ) {
    const where: Prisma.UserWhereInput = {
      role: 'COMMUNITY_ADMIN',
      deletedAt: null,
    };

    if (communityId) {
      where.communityId = communityId;
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          community: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  async getCommunityAdminById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        role: 'COMMUNITY_ADMIN',
        deletedAt: null,
      },
      include: {
        community: true,
      },
    });
  }
}
