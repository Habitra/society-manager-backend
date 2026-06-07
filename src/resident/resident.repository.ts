import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { Prisma, UserStatus, OccupancyType, UserRole } from '@prisma/client';

export type ResidentWithRelations = Prisma.UserGetPayload<{
  include: {
    residentProfile: true;
    residentAssignments: {
      include: {
        unit: {
          include: {
            tower: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ResidentRepository extends BaseRepository<'user'> {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, 'user', tenantContext);
  }

  async findResidentById(id: string): Promise<ResidentWithRelations | null> {
    return this.findOne({
      id,
      role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] },
      deletedAt: null,
    }, {
      include: {
        residentProfile: true,
        residentAssignments: {
          where: { deletedAt: null },
          include: {
            unit: {
              include: { tower: true },
            },
          },
        },
      }
    }) as Promise<ResidentWithRelations | null>;
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        communityId: this.communityId,
        email,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  async phoneExists(phone: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        communityId: this.communityId,
        phone,
        deletedAt: null,
      },
    });
    return count > 0;
  }
}
