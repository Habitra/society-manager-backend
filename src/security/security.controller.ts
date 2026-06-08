import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMMUNITY_ADMIN', 'MANAGER', 'GUARD')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('dashboard')
  getDashboard() {
    return this.securityService.getDashboard();
  }

  @Get('activity-feed')
  getActivityFeed(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getActivityFeed(Number(page) || 1, Number(limit) || 20);
  }

  @Get('visitors')
  getVisitors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getVisitors(search, Number(page) || 1, Number(limit) || 20);
  }

  @Get('deliveries')
  getDeliveries(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getDeliveries(search, Number(page) || 1, Number(limit) || 20);
  }

  @Get('vendors')
  getVendors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getVendors(search, Number(page) || 1, Number(limit) || 20);
  }

  @Get('service-staff')
  getServiceStaff(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getServiceStaff(search, Number(page) || 1, Number(limit) || 20);
  }

  @Get('vehicles')
  getVehicles(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.getVehicles(search, Number(page) || 1, Number(limit) || 20);
  }

  @Get('currently-inside')
  getCurrentlyInside(
    @Query('type') type?: string,
  ) {
    return this.securityService.getCurrentlyInside(type);
  }

  @Get('emergency-roll-call')
  getEmergencyRollCall() {
    return this.securityService.getEmergencyRollCall();
  }

  @Get('alerts')
  getAlerts() {
    return this.securityService.getAlerts();
  }

  @Get('analytics')
  getAnalytics() {
    return this.securityService.getAnalytics();
  }

  @Get('guards')
  getGuardPerformance() {
    return this.securityService.getGuardPerformance();
  }

  @Get('watchlist')
  getWatchlist(
    @Query('search') search?: string,
  ) {
    return this.securityService.getWatchlist(search);
  }

  @Post('watchlist')
  addToWatchlist(
    @CurrentUser() user: RequestUser,
    @Body() dto: any,
  ) {
    return this.securityService.addToWatchlist(user.id, dto);
  }

  @Patch('watchlist/:id')
  updateWatchlist(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.securityService.updateWatchlist(id, dto);
  }
}
