import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

export class UpdateTenantSettingsDto {
  communityName?: string;
  currency?: string;
  timezone?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: any;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getTenantSettings() {
    const community = await this.prisma.community.findUnique({
      where: { id: this.tenantContext.communityId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        currency: true,
        timezone: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
      }
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    return community;
  }

  async updateTenantSettings(dto: UpdateTenantSettingsDto) {
    const dataToUpdate: any = {};
    if (dto.communityName) dataToUpdate.name = dto.communityName;
    if (dto.currency) dataToUpdate.currency = dto.currency;
    if (dto.timezone) dataToUpdate.timezone = dto.timezone;
    if (dto.contactEmail) dataToUpdate.contactEmail = dto.contactEmail;
    if (dto.contactPhone) dataToUpdate.contactPhone = dto.contactPhone;
    if (dto.address) dataToUpdate.address = dto.address;

    const community = await this.prisma.community.update({
      where: { id: this.tenantContext.communityId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        currency: true,
        timezone: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
      }
    });

    return community;
  }

  async updateCommunityLogo(logoUrl: string) {
    const community = await this.prisma.community.update({
      where: { id: this.tenantContext.communityId },
      data: { logoUrl },
      select: { logoUrl: true }
    });

    return community;
  }
}
