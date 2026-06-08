import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { StaffProfileRepository, UserRepository } from './staff.repository';
import { AuditService } from '../audit/audit.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus, StaffCategory } from '@prisma/client';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: any;
  let maintenance: any;
  let audit: any;

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(async (cb) => cb(prisma)),
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      staffProfile: {
        create: jest.fn(),
      },
      usernameSequence: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const mockTenantContextService = {
      communityId: 'comm-123',
    };

    const mockStaffRepo = {};
    const mockUserRepo = {};

    const mockAuditService = {
      write: jest.fn(),
    };

    const mockMaintenanceService = {
      getAssignedTicketsCount: jest.fn(),
      getOpenAssignedTicketsCount: jest.fn(),
      getTicketsForStaff: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: StaffProfileRepository, useValue: mockStaffRepo },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: MaintenanceService, useValue: mockMaintenanceService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    prisma = module.get(PrismaService);
    maintenance = module.get(MaintenanceService);
    audit = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createStaff', () => {
    it('should throw ConflictException if email exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing' });
      await expect(service.createStaff({
        firstName: 'John', lastName: 'Doe', phone: '1234567890', email: 'john@example.com', staffType: StaffCategory.ELECTRICIAN
      })).rejects.toThrow(ConflictException);
    });

    it('should successfully create staff and profile', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.usernameSequence.findUnique.mockResolvedValueOnce({ nextValue: 1 });
      
      prisma.user.create.mockResolvedValueOnce({ id: 'user-1', role: UserRole.STAFF, status: UserStatus.ACTIVE });
      prisma.staffProfile.create.mockResolvedValueOnce({ id: 'prof-1' });

      const res = await service.createStaff({
        firstName: 'John', lastName: 'Doe', phone: '1234567890', staffType: StaffCategory.ELECTRICIAN
      });

      expect(res.user.id).toBe('user-1');
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: UserRole.STAFF,
          username: 'STF-000001',
          mustChangePassword: true,
        }),
      }));
      expect(prisma.staffProfile.create).toHaveBeenCalled();
      expect(audit.write).toHaveBeenCalled();
    });

    it('should set GUARD role if type is SECURITY_GUARD', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.usernameSequence.findUnique.mockResolvedValueOnce({ nextValue: 2 });
      
      prisma.user.create.mockResolvedValueOnce({ id: 'user-2', role: UserRole.GUARD });
      prisma.staffProfile.create.mockResolvedValueOnce({ id: 'prof-2' });

      await service.createStaff({
        firstName: 'Guard', lastName: 'One', phone: '123', staffType: StaffCategory.SECURITY_GUARD
      });

      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: UserRole.GUARD,
        }),
      }));
    });
  });

  describe('listStaff', () => {
    it('should fetch total count and items', async () => {
      prisma.user.count.mockResolvedValueOnce(10);
      prisma.user.findMany.mockResolvedValueOnce([{ id: 'user-1' }]);

      const res = await service.listStaff({ page: 1, limit: 10 });
      expect(res.meta.pagination.total).toBe(10);
      expect(res.data.length).toBe(1);
    });
  });

  describe('getStaffById', () => {
    it('should return staff details including tickets count', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'staff-1', staffProfile: {} });
      maintenance.getAssignedTicketsCount.mockResolvedValueOnce(5);
      maintenance.getOpenAssignedTicketsCount.mockResolvedValueOnce(2);

      const res = await service.getStaffById('staff-1');
      expect(res.assignedTicketsCount).toBe(5);
      expect(res.openTicketsCount).toBe(2);
    });

    it('should throw NotFound if staff not found', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.getStaffById('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate/deactivate', () => {
    it('should update status to ACTIVE', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'staff-1', status: UserStatus.INACTIVE });
      prisma.user.update.mockResolvedValueOnce({ id: 'staff-1', status: UserStatus.ACTIVE });

      await service.activateStaff('staff-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'staff-1' },
        data: { status: UserStatus.ACTIVE },
      });
      expect(audit.write).toHaveBeenCalled();
    });

    it('should update status to INACTIVE', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'staff-1', status: UserStatus.ACTIVE });
      prisma.user.update.mockResolvedValueOnce({ id: 'staff-1', status: UserStatus.INACTIVE });

      await service.deactivateStaff('staff-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'staff-1' },
        data: { status: UserStatus.INACTIVE },
      });
    });
  });

  describe('getGuards', () => {
    it('should filter only security guards', async () => {
      prisma.user.findMany.mockResolvedValueOnce([{ id: 'guard-1' }]);
      await service.getGuards();

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          staffProfile: { category: StaffCategory.SECURITY_GUARD },
        }),
      }));
    });
  });
});
