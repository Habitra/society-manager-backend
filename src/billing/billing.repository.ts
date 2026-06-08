import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BaseRepository } from '../database/base.repository';

@Injectable()
export class InvoiceCycleRepository extends BaseRepository<'invoiceCycle'> {
  constructor(prisma: PrismaService, tenant: TenantContextService) { super(prisma, 'invoiceCycle', tenant); }
}

@Injectable()
export class InvoiceRepository extends BaseRepository<'invoice'> {
  constructor(prisma: PrismaService, tenant: TenantContextService) { super(prisma, 'invoice', tenant); }
}

@Injectable()
export class InvoiceLineItemRepository extends BaseRepository<'invoiceLineItem'> {
  constructor(prisma: PrismaService, tenant: TenantContextService) { super(prisma, 'invoiceLineItem', tenant); }
}

@Injectable()
export class PaymentRepository extends BaseRepository<'payment'> {
  constructor(prisma: PrismaService, tenant: TenantContextService) { super(prisma, 'payment', tenant); }
}

@Injectable()
export class BillingRepository {
  constructor(
    public readonly invoiceCycle: InvoiceCycleRepository,
    public readonly invoice: InvoiceRepository,
    public readonly invoiceLineItem: InvoiceLineItemRepository,
    public readonly payment: PaymentRepository,
  ) {}
}
