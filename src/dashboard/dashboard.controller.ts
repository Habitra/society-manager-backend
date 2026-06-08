import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';
import { MaintenanceDashboardDto } from './dto/maintenance-dashboard.dto';
import { VisitorDashboardDto } from './dto/visitor-dashboard.dto';
import { OccupancyDashboardDto } from './dto/occupancy-dashboard.dto';

@ApiTags('Dashboard Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
@Controller('dashboard')
@UseInterceptors(CacheInterceptor)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @CacheTTL(300000) // 5 minutes cache
  @ApiOperation({ summary: 'Get overview metrics' })
  @ApiResponse({ status: 200, type: DashboardOverviewDto })
  async getOverview() {
    return this.dashboardService.getOverviewMetrics();
  }

  @Get('maintenance')
  @CacheTTL(300000)
  @ApiOperation({ summary: 'Get maintenance metrics' })
  @ApiResponse({ status: 200, type: MaintenanceDashboardDto })
  async getMaintenance() {
    return this.dashboardService.getMaintenanceMetrics();
  }

  @Get('visitors')
  @CacheTTL(300000)
  @ApiOperation({ summary: 'Get visitor metrics' })
  @ApiResponse({ status: 200, type: VisitorDashboardDto })
  async getVisitors() {
    return this.dashboardService.getVisitorMetrics();
  }

  @Get('occupancy')
  @CacheTTL(300000)
  @ApiOperation({ summary: 'Get occupancy metrics' })
  @ApiResponse({ status: 200, type: OccupancyDashboardDto })
  async getOccupancy() {
    return this.dashboardService.getOccupancyMetrics();
  }

  @Get('activity')
  @CacheTTL(60000) // 1 minute cache
  @ApiOperation({ summary: 'Get recent activity timeline' })
  @ApiResponse({ status: 200 })
  async getActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Get('recent-tickets')
  @CacheTTL(60000)
  @ApiOperation({ summary: 'Get recent maintenance tickets' })
  @ApiResponse({ status: 200 })
  async getRecentTickets() {
    return this.dashboardService.getRecentTickets();
  }
}
