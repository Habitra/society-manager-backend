import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BillingRepository } from './billing.repository';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceCycleDto } from './dto/create-invoice-cycle.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { toPaginatedResult, toPrismaPage } from '../common/utils/pagination.util';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly repo: BillingRepository,
    private readonly audit: AuditService,
  ) {}

  // ==============================================================================
  // INVOICE CYCLE MANAGEMENT
  // ==============================================================================

  async createCycle(dto: CreateInvoiceCycleDto) {
    const cycle = await this.repo.invoiceCycle.create({
      data: {
        name: dto.name,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        dueDate: new Date(dto.dueDate),
        baseAmount: dto.baseAmount,
        lateFeeType: dto.lateFeeType,
        lateFeeValue: dto.lateFeeValue,
        metadata: dto.metadata || {},
      },
    });

    await this.audit.write({
      action: 'CREATE',
      tableName: 'invoice_cycles',
      recordId: cycle.id as string,
      newValues: cycle,
    });

    return cycle;
  }

  async getCycles() {
    return this.repo.invoiceCycle.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
  }

  async getCycleById(id: string) {
    const cycle = await this.repo.invoiceCycle.findById(id) as any;
    if (!cycle) throw new NotFoundException('Invoice Cycle not found');
    return cycle;
  }

  // ==============================================================================
  // INVOICE GENERATION
  // ==============================================================================

  async generateInvoices(cycleId: string, dto: GenerateInvoicesDto) {
    const cycle = await this.getCycleById(cycleId);
    const communityId = this.tenantContext.communityId;

    // Active units: not VACANT
    const activeUnits = await this.prisma.unit.findMany({
      where: {
        communityId,
        deletedAt: null,
        occupancy: { in: ['OWNER', 'TENANT'] }, // Active units
      },
      include: {
        tower: true,
      },
    });

    const generatedInvoices = [];
    let sequenceCounter = await this.getSequenceValue(`INVOICE_${new Date().getFullYear()}`);

    for (const unit of activeUnits) {
      // Check if invoice already exists for this unit and cycle
      const existing = await this.prisma.invoice.findUnique({
        where: {
          cycleId_unitId: {
            cycleId,
            unitId: unit.id,
          },
        },
      });

      if (existing) continue;

      // Generate INV-YYYY-XXXXXX
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(sequenceCounter).padStart(6, '0')}`;
      sequenceCounter++;

      const subtotal = Number(cycle.baseAmount);
      // Extra line items
      let extraTotal = 0;
      const extraItems = dto.additionalLineItems || [];
      for (const item of extraItems) {
        extraTotal += item.amount;
      }
      const totalAmount = subtotal + extraTotal;

      const invoice = await this.prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            communityId,
            cycleId,
            unitId: unit.id,
            invoiceNumber,
            status: 'DRAFT',
            subtotal,
            totalAmount,
            paidAmount: 0,
            invoiceDate: new Date(),
            dueDate: cycle.dueDate,
            metadata: {
              unitNumber: unit.unitNumber,
              towerName: (unit as any).tower?.name || null,
            },
            lineItems: {
              create: [
                {
                  communityId,
                  description: 'Base Charge',
                  unitPrice: cycle.baseAmount,
                  total: cycle.baseAmount,
                },
                ...extraItems.map(item => ({
                  communityId,
                  description: item.description,
                  unitPrice: item.amount,
                  total: item.amount,
                })),
              ],
            },
          },
        });

        await this.incrementSequenceValue(`INVOICE_${new Date().getFullYear()}`);
        return inv;
      });

      generatedInvoices.push(invoice);

      await this.audit.write({
        action: 'CREATE',
        tableName: 'invoices',
        recordId: invoice.id,
        newValues: invoice,
      });
    }

    return { generatedCount: generatedInvoices.length, invoices: generatedInvoices };
  }

  // ==============================================================================
  // INVOICE DETAILS & LISTING
  // ==============================================================================

  async listInvoices(dto: PaginationDto) {
    const { skip, take } = toPrismaPage(dto);

    const [items, total] = await Promise.all([
      this.repo.invoice.findMany({
        where: { deletedAt: null },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take,
        include: { unit: { include: { tower: true } } },
      }),
      this.repo.invoice.count({
        where: { deletedAt: null },
      }),
    ]);

    return toPaginatedResult(items, total, dto);
  }

  async getInvoiceById(id: string) {
    const invoice = await this.repo.invoice.findById(id, {
      include: {
        lineItems: true,
        payments: true,
        unit: { include: { tower: true } },
      },
    }) as any;
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  // ==============================================================================
  // RESIDENT BILLING (My Invoices)
  // ==============================================================================

  async getMyInvoices(userId: string) {
    const communityId = this.tenantContext.communityId;

    // Find units assigned to this user
    const assignments = await this.prisma.residentUnitAssignment.findMany({
      where: {
        communityId,
        userId,
        deletedAt: null,
      },
    });

    const unitIds = assignments.map(a => a.unitId);

    if (unitIds.length === 0) return [];

    return this.prisma.invoice.findMany({
      where: {
        communityId,
        unitId: { in: unitIds },
        deletedAt: null,
      },
      orderBy: { invoiceDate: 'desc' },
      include: { unit: { include: { tower: true } } },
    });
  }

  // ==============================================================================
  // PAYMENT & RECEIPTS
  // ==============================================================================

  async recordPayment(invoiceId: string, dto: RecordPaymentDto) {
    const communityId = this.tenantContext.communityId;
    const invoice = await this.getInvoiceById(invoiceId);

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }

    const newPaidAmount = Number(invoice.paidAmount) + dto.amount;

    let newStatus = invoice.status;
    if (newPaidAmount >= Number(invoice.totalAmount)) {
      newStatus = 'PAID';
    } else {
      newStatus = 'PARTIALLY_PAID';
    }

    let receiptNumberSequence = await this.getSequenceValue(`RECEIPT_${new Date().getFullYear()}`);
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(receiptNumberSequence).padStart(6, '0')}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          communityId,
          invoiceId,
          amount: dto.amount,
          mode: dto.paymentMode,
          status: 'SUCCESS',
          receiptNumber,
          paidAt: new Date(),
          gatewayTxnId: dto.referenceNumber,
          notes: dto.notes,
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      await this.incrementSequenceValue(`RECEIPT_${new Date().getFullYear()}`);

      return p;
    });

    await this.audit.write({
      action: 'CREATE',
      tableName: 'payments',
      recordId: payment.id,
      newValues: payment,
    });

    return payment;
  }

  // ==============================================================================
  // DASHBOARD AGGREGATIONS
  // ==============================================================================

  async getTotalCollected() {
    const result = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        communityId: this.tenantContext.communityId,
        status: 'SUCCESS',
      },
    });
    return result._sum.amount || 0;
  }

  async getTotalOutstanding() {
    const invoices = await this.repo.invoice.findMany({
      where: {
        status: { in: ['DRAFT', 'PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
        deletedAt: null,
      },
      select: { totalAmount: true, paidAmount: true },
    });

    let outstanding = 0;
    for (const inv of invoices) {
      outstanding += (Number(inv.totalAmount) - Number(inv.paidAmount));
    }
    return outstanding;
  }

  async getOverdueInvoices() {
    return this.repo.invoice.findMany({
      where: {
        status: 'OVERDUE',
        deletedAt: null,
      },
      include: { unit: true },
    });
  }

  // Helper for sequential sequences
  private async getSequenceValue(type: string): Promise<number> {
    const communityId = this.tenantContext.communityId;
    const seq = await this.prisma.usernameSequence.findUnique({
      where: { communityId_userType: { communityId, userType: type } },
    });
    return seq ? seq.nextValue + 1 : 1;
  }

  private async incrementSequenceValue(type: string) {
    const communityId = this.tenantContext.communityId;
    await this.prisma.usernameSequence.upsert({
      where: { communityId_userType: { communityId, userType: type } },
      update: { nextValue: { increment: 1 } },
      create: { communityId, userType: type, nextValue: 1 },
    });
  }
}
