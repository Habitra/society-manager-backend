import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementStatus, TargetAudience, UserRole } from '@prisma/client';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(communityId: string, authorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        communityId,
        authorId,
        title: dto.title,
        description: dto.description,
        content: dto.content,
        priority: dto.priority,
        targetAudiences: dto.targetAudiences,
        isPinned: dto.isPinned,
        expiresAt: dto.expiresAt,
        attachments: dto.attachments || [],
      },
    });
  }

  async findAll(communityId: string) {
    return this.prisma.announcement.findMany({
      where: { communityId },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        author: {
          select: { id: true, displayName: true }
        }
      }
    });
  }

  async findOne(communityId: string, id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id, communityId },
      include: {
        author: {
          select: { id: true, displayName: true }
        }
      }
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async update(communityId: string, id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(communityId, id); // verify exists
    return this.prisma.announcement.update({
      where: { id, communityId },
      data: {
        ...dto,
      },
    });
  }

  async publish(communityId: string, id: string) {
    await this.findOne(communityId, id);
    return this.prisma.announcement.update({
      where: { id, communityId },
      data: {
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async archive(communityId: string, id: string) {
    await this.findOne(communityId, id);
    return this.prisma.announcement.update({
      where: { id, communityId },
      data: {
        status: AnnouncementStatus.ARCHIVED,
      },
    });
  }

  async remove(communityId: string, id: string) {
    await this.findOne(communityId, id);
    return this.prisma.announcement.update({
      where: { id, communityId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findMyFeed(communityId: string, userId: string, role: UserRole) {
    // Map UserRole to TargetAudience
    let userAudiences: TargetAudience[] = [TargetAudience.ALL_RESIDENTS];
    
    switch (role) {
      case UserRole.RESIDENT:
        // Ideally we check OccupancyType but sticking to general mappings
        userAudiences.push(TargetAudience.TENANTS, TargetAudience.OWNER_RESIDENTS);
        break;
      case UserRole.STAFF:
        userAudiences.push(TargetAudience.STAFF);
        break;
      case UserRole.GUARD:
        userAudiences.push(TargetAudience.GUARDS);
        break;
      case UserRole.COMMUNITY_ADMIN:
        userAudiences.push(TargetAudience.COMMUNITY_ADMIN);
        break;
      case UserRole.MANAGER:
        userAudiences.push(TargetAudience.MANAGER);
        break;
    }

    const now = new Date();

    const announcements = await this.prisma.announcement.findMany({
      where: {
        communityId,
        status: AnnouncementStatus.PUBLISHED,
        deletedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ],
        targetAudiences: {
          hasSome: userAudiences
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        author: {
          select: { id: true, displayName: true }
        },
        reads: {
          where: { userId }
        }
      }
    });

    return announcements.map((a: any) => {
      const isRead = a.reads && a.reads.length > 0;
      const { reads, ...rest } = a;
      return { ...rest, isRead };
    });
  }

  async markAsRead(communityId: string, announcementId: string, userId: string) {
    await this.findOne(communityId, announcementId); // verify exists
    
    // Upsert read status
    const existing = await this.prisma.announcementReadStatus.findUnique({
      where: {
        announcementId_userId: {
          userId,
          announcementId
        }
      }
    });

    if (!existing) {
      return this.prisma.announcementReadStatus.create({
        data: {
          communityId,
          userId,
          announcementId
        }
      });
    }
    return existing;
  }
}
