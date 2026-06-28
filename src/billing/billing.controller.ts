import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceCycleDto } from './dto/create-invoice-cycle.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Billing & Payments')
@ApiBearerAuth()

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Post('cycles')
  @ApiOperation({ summary: 'Create Invoice Cycle' })
  async createCycle(@Body() dto: CreateInvoiceCycleDto) {
    return this.billingService.createCycle(dto);
  }

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Get('cycles')
  @ApiOperation({ summary: 'List Invoice Cycles' })
  async getCycles() {
    return this.billingService.getCycles();
  }

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Get('cycles/:id')
  @ApiOperation({ summary: 'Get Invoice Cycle Details' })
  async getCycleById(@Param('id') id: string) {
    return this.billingService.getCycleById(id);
  }

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Post('cycles/:id/generate')
  @ApiOperation({ summary: 'Generate invoices for a cycle' })
  async generateInvoices(@Param('id') id: string, @Body() dto: GenerateInvoicesDto) {
    return this.billingService.generateInvoices(id, dto);
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Get('invoices')
  @ApiOperation({ summary: 'List all invoices' })
  @ApiPaginatedResponse(Object)
  async listInvoices(@Query() dto: PaginationDto) {
    return this.billingService.listInvoices(dto);
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoiceById(@Param('id') id: string) {
    return this.billingService.getInvoiceById(id);
  }

  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @Post('invoices/:id/payments')
  @ApiOperation({ summary: 'Record manual payment' })
  async recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.billingService.recordPayment(id, dto);
  }

  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER)
  @Get('my-invoices')
  @ApiOperation({ summary: 'List invoices for my assigned units' })
  async getMyInvoices(@Request() req: any) {
    return this.billingService.getMyInvoices(req.user.id);
  }

  @Roles(UserRole.COMMUNITY_ADMIN)
  @Get('dashboard/outstanding')
  @ApiOperation({ summary: 'Get outstanding dues dashboard' })
  async getOutstandingDues() {
    const [totalCollected, totalOutstanding, overdueInvoices] = await Promise.all([
      this.billingService.getTotalCollected(),
      this.billingService.getTotalOutstanding(),
      this.billingService.getOverdueInvoices(),
    ]);

    return {
      totalCollected,
      totalOutstanding,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoices,
    };
  }
}
