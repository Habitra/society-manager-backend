import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class VendorsBlacklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Blacklist a vendor
   */
  async blacklistVendor(vendorId: string, reason: string, adminId: string) {
    const communityId = this.tenantContext.communityId;

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId, communityId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'BLACKLISTED',
        blacklistReason: reason,
        blacklistDate: new Date(),
        blacklistAdminId: adminId,
        riskLevel: 'CRITICAL',
      },
    });
  }

  /**
   * Fetch the Blacklist Registry
   */
  async getBlacklistRegistry() {
    const communityId = this.tenantContext.communityId;

    const blacklistedVendors = await this.prisma.vendor.findMany({
      where: {
        communityId,
        status: 'BLACKLISTED',
      },
      select: {
        id: true,
        name: true,
        blacklistReason: true,
        blacklistDate: true,
        admin: {
          select: {
            displayName: true,
          },
        },
        riskLevel: true, // Used for 'Risk Impact'
      },
      orderBy: {
        blacklistDate: 'desc',
      },
    });

    return blacklistedVendors.map((vendor) => ({
      vendorId: vendor.id,
      vendorName: vendor.name,
      reason: vendor.blacklistReason,
      date: vendor.blacklistDate,
      adminName: vendor.admin?.displayName || 'System',
      riskImpact: vendor.riskLevel,
    }));
  }
}
