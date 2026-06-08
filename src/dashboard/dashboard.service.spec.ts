import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MaintenanceService } from '../maintenance/maintenance.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;
  let tenantContext: any;
  let maintenanceService: jest.Mocked<MaintenanceService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: { count: jest.fn(), findMany: jest.fn() },
      unit: { count: jest.fn() },
      gateEntry: { count: jest.fn(), findMany: jest.fn() },
      visitorRequest: { count: jest.fn() },
      gatePass: { count: jest.fn() },
      residentUnitAssignment: { groupBy: jest.fn() },
    };

    const mockTenantContextService = {
      communityId: 'comm-123',
    };

    const mockMaintenanceService = {
      getOpenTicketsCount: jest.fn().mockResolvedValue(10),
      getInProgressTicketsCount: jest.fn().mockResolvedValue(5),
      getResolvedTicketsCount: jest.fn().mockResolvedValue(2),
      getClosedTicketsCount: jest.fn().mockResolvedValue(1),
      getTicketsByCategory: jest.fn().mockResolvedValue([]),
      getTicketsByPriority: jest.fn().mockResolvedValue([]),
      getRecentTickets: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: MaintenanceService, useValue: mockMaintenanceService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    maintenanceService = module.get(MaintenanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverviewMetrics', () => {
    it('should calculate counts securely within tenant scope', async () => {
      prisma.user.count.mockResolvedValue(50);
      prisma.unit.count.mockResolvedValue(100);
      prisma.gateEntry.count.mockResolvedValue(15);

      const res = await service.getOverviewMetrics();

      expect(res.totalResidents).toBe(50);
      expect(res.totalUnits).toBe(100);
      expect(res.totalVisitorsToday).toBe(15);
      expect(res.openTickets).toBe(10);
      expect(prisma.user.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ communityId: 'comm-123' }) }));
    });
  });

  describe('getOccupancyMetrics', () => {
    it('should aggregate occupancy types', async () => {
      prisma.residentUnitAssignment.groupBy.mockResolvedValue([
        { occupancyType: 'OWNER_RESIDENT', _count: { _all: 20 } },
        { occupancyType: 'TENANT', _count: { _all: 30 } },
        { occupancyType: 'OWNER_NON_RESIDENT', _count: { _all: 10 } },
      ]);

      const res = await service.getOccupancyMetrics();

      expect(res.ownerResidents).toBe(20);
      expect(res.tenants).toBe(30);
      expect(res.nonResidentOwners).toBe(10);
      expect(prisma.residentUnitAssignment.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ communityId: 'comm-123' }) }));
    });
  });
});
