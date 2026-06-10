import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { ContractRenewalStatus } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Propose a renewal for an existing contract
   */
  async initiateRenewal(contractId: string, adminId: string, notes?: string) {
    const communityId = this.tenantContext.communityId;

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId, communityId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status === 'TERMINATED') {
      throw new BadRequestException('Cannot renew a terminated contract');
    }

    // Create renewal history record
    const renewalHistory = await this.prisma.contractRenewalHistory.create({
      data: {
        communityId,
        contractId,
        adminId,
        status: 'PENDING_REVIEW',
        notes,
      },
    });

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: 'PENDING_REVIEW' },
    });

    return renewalHistory;
  }

  /**
   * Update the status of a contract renewal
   */
  async updateRenewalStatus(
    contractId: string,
    status: ContractRenewalStatus,
    adminId: string,
    notes?: string,
  ) {
    const communityId = this.tenantContext.communityId;

    const renewalHistory = await this.prisma.contractRenewalHistory.create({
      data: {
        communityId,
        contractId,
        adminId,
        status,
        notes,
      },
    });

    let newContractStatus = status as any; // Map RenewalStatus to ContractStatus
    if (status === 'TERMINATED') {
      newContractStatus = 'TERMINATED';
    } else if (status === 'RENEWED') {
      newContractStatus = 'RENEWED';
    } else if (status === 'APPROVED') {
      newContractStatus = 'APPROVED';
    } else if (status === 'UNDER_NEGOTIATION') {
      newContractStatus = 'UNDER_NEGOTIATION';
    }

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: newContractStatus },
    });

    return renewalHistory;
  }

  /**
   * Get complete renewal history for a contract
   */
  async getRenewalHistory(contractId: string) {
    const communityId = this.tenantContext.communityId;
    return this.prisma.contractRenewalHistory.findMany({
      where: { communityId, contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { displayName: true },
        },
      },
    });
  }
}
