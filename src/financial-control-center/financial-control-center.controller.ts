import { Controller, Get, Patch, Post, Body, Query, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { FinancialControlCenterService } from './financial-control-center.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@ApiBearerAuth()

@Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
@Controller('financial-control-center')
export class FinancialControlCenterController {
  constructor(private readonly fccService: FinancialControlCenterService) {}

  @AuthenticatedOnly()
  @Get('overview')
  getOverview() {
    return this.fccService.getOverview();
  }

  @AuthenticatedOnly()
  @Get('insights')
  getInsights() {
    return this.fccService.getInsights();
  }

  @AuthenticatedOnly()
  @Get('units')
  getUnits(@Query() query: any) {
    return this.fccService.getUnits(query);
  }

  @AuthenticatedOnly()
  @Get('export')
  async exportUnits(@Query() query: any, @Res() res: Response) {
    const csv = await this.fccService.exportUnits(query);
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Financial_Report_${dateStr}.csv`);
    res.send(csv);
  }

  @AuthenticatedOnly()
  @Get('defaulters')
  getDefaulters() {
    return this.fccService.getDefaulters();
  }

  @AuthenticatedOnly()
  @Get('analytics')
  getAnalytics() {
    return this.fccService.getAnalytics();
  }

  @AuthenticatedOnly()
  @Get('audit')
  getAuditTrail() {
    return this.fccService.getAuditTrail();
  }

  @AuthenticatedOnly()
  @Patch('unit/:id')
  inlineAdjustment(
    @Param('id') id: string,
    @Body() payload: { type: string; amount: number; reason: string; invoiceId?: string }
  ) {
    return this.fccService.inlineAdjustment(id, payload);
  }

  @AuthenticatedOnly()
  @Post('bulk-actions')
  bulkActions(@Body() payload: { action: string; unitIds: string[] }) {
    return this.fccService.bulkActions(payload);
  }

  @AuthenticatedOnly()
  @Post('demand-notice')
  generateDemandNotice(@Body() payload: { unitIds: string[] }) {
    return this.fccService.generateDemandNotice(payload);
  }

  @AuthenticatedOnly()
  @Post('follow-up')
  markFollowUp(@Body() payload: { unitIds: string[]; followUpDate: string; notes: string }) {
    return this.fccService.markFollowUp(payload);
  }
}
