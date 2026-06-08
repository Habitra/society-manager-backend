import { Controller, Get, Patch, Post, Body, Query, Param } from '@nestjs/common';
import { FinancialControlCenterService } from './financial-control-center.service';

@Controller('financial-control-center')
export class FinancialControlCenterController {
  constructor(private readonly fccService: FinancialControlCenterService) {}

  @Get('overview')
  getOverview() {
    return this.fccService.getOverview();
  }

  @Get('insights')
  getInsights() {
    return this.fccService.getInsights();
  }

  @Get('units')
  getUnits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tower') tower?: string,
    @Query('status') status?: string,
  ) {
    return this.fccService.getUnits({ page, limit, search, tower, status });
  }

  @Get('defaulters')
  getDefaulters() {
    return this.fccService.getDefaulters();
  }

  @Get('analytics')
  getAnalytics() {
    return this.fccService.getAnalytics();
  }

  @Get('audit')
  getAuditTrail() {
    return this.fccService.getAuditTrail();
  }

  @Patch('unit/:id')
  inlineAdjustment(
    @Param('id') id: string,
    @Body() payload: { type: string; amount: number; reason: string; invoiceId?: string }
  ) {
    return this.fccService.inlineAdjustment(id, payload);
  }

  @Post('bulk-actions')
  bulkActions(@Body() payload: { action: string; unitIds: string[] }) {
    return this.fccService.bulkActions(payload);
  }
}
