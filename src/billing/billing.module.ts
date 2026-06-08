import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository, InvoiceCycleRepository, InvoiceRepository, InvoiceLineItemRepository, PaymentRepository } from './billing.repository';
import { AuditModule } from '../audit/audit.module';
import { ResidentAssignmentModule } from '../resident-assignment/resident-assignment.module';

import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuditModule, ResidentAssignmentModule, TenantModule, PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, InvoiceCycleRepository, InvoiceRepository, InvoiceLineItemRepository, PaymentRepository],
  exports: [BillingService],
})
export class BillingModule {}
