import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@Controller('security')

@Roles('COMMUNITY_ADMIN', 'MANAGER', 'GUARD')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @AuthenticatedOnly()
  @Get('dashboard')
  getDashboard() {
    return this.securityService.getDashboard();
  }

  @AuthenticatedOnly()
  @Get('activity-feed')
  getActivityFeed(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getActivityFeed(Number(page) || 1, Number(limit) || 20);
  }

  @AuthenticatedOnly()
  @Get('visitors')
  getVisitors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getVisitors(search, Number(page) || 1, Number(limit) || 20);
  }

  @AuthenticatedOnly()
  @Get('deliveries')
  getDeliveries(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getDeliveries(search, Number(page) || 1, Number(limit) || 20);
  }

  @AuthenticatedOnly()
  @Get('vendors')
  getVendors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getVendors(search, Number(page) || 1, Number(limit) || 20);
  }

  @AuthenticatedOnly()
  @Get('service-staff')
  getServiceStaff(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getServiceStaff(search, Number(page) || 1, Number(limit) || 20);
  }

  @AuthenticatedOnly()
  @Get('vehicles')
  getVehicles(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getVehicles(search, Number(page) || 1, Number(limit) || 20);
  }

  @AuthenticatedOnly()
  @Get('currently-inside')
  getCurrentlyInside(
    @Query('type') type?: string,
  ) {
    return this.securityService.getCurrentlyInside(type);
  }

  @AuthenticatedOnly()
  @Get('emergency-roll-call')
  getEmergencyRollCall() {
    return this.securityService.getEmergencyRollCall();
  }

  @AuthenticatedOnly()
  @Get('alerts')
  getAlerts() {
    return this.securityService.getAlerts();
  }

  @AuthenticatedOnly()
  @Get('analytics')
  getAnalytics() {
    return this.securityService.getAnalytics();
  }

  @AuthenticatedOnly()
  @Get('guards')
  getGuardPerformance() {
    return this.securityService.getGuardPerformance();
  }

  @AuthenticatedOnly()
  @Get('watchlist')
  getWatchlist(
    @Query('search') search?: string,
  ) {
    return this.securityService.getWatchlist(search);
  }

  @AuthenticatedOnly()
  @Post('watchlist')
  addToWatchlist(
    @CurrentUser() user: RequestUser,
    @Body() dto: any,
  ) {
    return this.securityService.addToWatchlist(user.id, dto);
  }

  @AuthenticatedOnly()
  @Patch('watchlist/:id')
  updateWatchlist(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.securityService.updateWatchlist(id, dto);
  }
}
