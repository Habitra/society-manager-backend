import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BillingRepository } from './billing.repository';
import { AuditService } from '../audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;
  let repo: any;
  let audit: any;
  let tenantContext: any;

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(async (cb) => cb(prisma)),
      unit: { findMany: jest.fn() },
      invoice: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
      payment: { create: jest.fn(), aggregate: jest.fn() },
      residentUnitAssignment: { findMany: jest.fn() },
      usernameSequence: { findUnique: jest.fn(), upsert: jest.fn() },
    };

    const mockTenantContextService = {
      communityId: 'comm-123',
    };

    const mockRepo = {
      invoiceCycle: { create: jest.fn(), findMany: jest.fn(), findById: jest.fn() },
      invoice: { findMany: jest.fn(), findById: jest.fn() },
      invoiceLineItem: { create: jest.fn() },
      payment: { create: jest.fn() },
    };

    const mockAuditService = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: BillingRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    repo = module.get(BillingRepository);
    audit = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvoices', () => {
    it('should generate invoices for active units without duplicates', async () => {
      repo.invoiceCycle.findById.mockResolvedValue({ id: 'cycle-1', baseAmount: 1500, dueDate: new Date() });
      prisma.unit.findMany.mockResolvedValue([
        { id: 'unit-1', unitNumber: '101', tower: { name: 'A' } },
        { id: 'unit-2', unitNumber: '102', tower: { name: 'B' } },
      ]);
      prisma.invoice.findUnique.mockResolvedValueOnce({ id: 'existing-inv' }); // unit-1 already has invoice
      prisma.invoice.findUnique.mockResolvedValueOnce(null); // unit-2 does not
      prisma.usernameSequence.findUnique.mockResolvedValue({ nextValue: 5 });
      prisma.invoice.create.mockResolvedValue({ id: 'new-inv', invoiceNumber: 'INV-2026-000005' });

      const res = await service.generateInvoices('cycle-1', { additionalLineItems: [] });

      expect(res.generatedCount).toBe(1);
      expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
      expect(prisma.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          unitId: 'unit-2',
          invoiceNumber: expect.stringMatching(/INV-\d{4}-000006/),
        }),
      }));
    });
  });

  describe('recordPayment', () => {
    it('should record payment and update invoice status to PAID if fully paid', async () => {
      repo.invoice.findById.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        paidAmount: 500,
        totalAmount: 1500,
      });
      prisma.usernameSequence.findUnique.mockResolvedValue({ nextValue: 1 });
      prisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 1000 });

      await service.recordPayment('inv-1', { amount: 1000, paymentMode: 'UPI' } as any);

      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'inv-1' },
        data: { paidAmount: 1500, status: 'PAID' },
      }));
      expect(audit.write).toHaveBeenCalled();
    });

    it('should update to PARTIALLY_PAID if underpaid', async () => {
      repo.invoice.findById.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        paidAmount: 0,
        totalAmount: 1500,
      });
      prisma.usernameSequence.findUnique.mockResolvedValue({ nextValue: 1 });
      prisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 500 });

      await service.recordPayment('inv-1', { amount: 500, paymentMode: 'UPI' } as any);

      expect(prisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { paidAmount: 500, status: 'PARTIALLY_PAID' },
      }));
    });

    it('should throw if already paid', async () => {
      repo.invoice.findById.mockResolvedValue({
        id: 'inv-1',
        status: 'PAID',
      });

      await expect(service.recordPayment('inv-1', { amount: 100 } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyInvoices', () => {
    it('should return invoices scoped to resident assigned units', async () => {
      prisma.residentUnitAssignment.findMany.mockResolvedValue([{ unitId: 'u-1' }, { unitId: 'u-2' }]);
      prisma.invoice.findMany.mockResolvedValue([{ id: 'inv-1', unitId: 'u-1' }]);

      const res = await service.getMyInvoices('user-1');

      expect(prisma.residentUnitAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', communityId: 'comm-123' }),
      }));
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ unitId: { in: ['u-1', 'u-2'] } }),
      }));
      expect(res.length).toBe(1);
    });
  });

  describe('Dashboard Aggregations', () => {
    it('should calculate total outstanding correctly', async () => {
      repo.invoice.findMany.mockResolvedValue([
        { totalAmount: 1000, paidAmount: 500 },
        { totalAmount: 2000, paidAmount: 0 },
      ]);

      const outstanding = await service.getTotalOutstanding();
      expect(outstanding).toBe(2500);
    });
  });
});
