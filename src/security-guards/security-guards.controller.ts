import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { SecurityGuardsService } from './security-guards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@Controller('security-guards')

@Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
export class SecurityGuardsController {
  constructor(private readonly securityService: SecurityGuardsService) {}

  @AuthenticatedOnly()
  @Get('dashboard')
  async getDashboard() {
    return this.securityService.getDashboard();
  }

  @AuthenticatedOnly()
  @Get()
  async getGuards(@Query() query: any) {
    return this.securityService.getGuards(query);
  }

  @AuthenticatedOnly()
  @Get('shifts')
  async getShifts() {
    return this.securityService.getShifts();
  }

  @AuthenticatedOnly()
  @Get('attendance')
  async getAttendance(@Query() query: any) {
    return this.securityService.getAttendance(query);
  }

  @AuthenticatedOnly()
  @Get('incidents')
  async getIncidents(@Query() query: any) {
    return this.securityService.getIncidents(query);
  }

  @AuthenticatedOnly()
  @Get('performance')
  async getPerformance() {
    return this.securityService.getPerformance();
  }

  @AuthenticatedOnly()
  @Get('audit')
  async getAudit(@Query() query: any) {
    return this.securityService.getAudit(query);
  }

  @AuthenticatedOnly()
  @Post('incidents')
  async createIncident(@Body() dto: any) {
    return this.securityService.createIncident(dto);
  }

  @AuthenticatedOnly()
  @Patch(':id')
  async updateGuard(@Param('id') id: string, @Body() dto: any) {
    return this.securityService.updateGuard(id, dto);
  }

  @AuthenticatedOnly()
  @Patch('shifts/:id')
  async updateShift(@Param('id') id: string, @Body() dto: any) {
    return this.securityService.updateShift(id, dto);
  }
}
