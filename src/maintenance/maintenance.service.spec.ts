import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MaintenanceRepository } from './maintenance.repository';
import { ResidentAssignmentRepository } from '../resident-assignment/resident-assignment.repository';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketPriority, TicketStatus } from '@prisma/client';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let maintenanceRepository: jest.Mocked<MaintenanceRepository>;
  let residentAssignmentRepository: jest.Mocked<ResidentAssignmentRepository>;
  let prisma: any;
  let tenantContext: any;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockMaintenanceRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockResidentAssignmentRepository = {
      findByUser: jest.fn(),
    };

    const mockPrismaService = {
      usernameSequence: { upsert: jest.fn() },
      maintenanceCategory: { findFirst: jest.fn() },
      staffProfile: { findFirst: jest.fn() },
      maintenanceComment: { findMany: jest.fn() },
      maintenanceAttachment: { findMany: jest.fn() },
      auditLog: { findMany: jest.fn() },
      maintenanceTicket: { groupBy: jest.fn() },
    };

    const mockTenantContextService = {
      communityId: 'comm-123',
      userId: 'user-123',
    };

    const mockAuditService = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: MaintenanceRepository, useValue: mockMaintenanceRepository },
        { provide: ResidentAssignmentRepository, useValue: mockResidentAssignmentRepository },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    maintenanceRepository = module.get(MaintenanceRepository);
    residentAssignmentRepository = module.get(ResidentAssignmentRepository);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignTicket', () => {
    it('should throw BadRequestException if staff does not exist or is inactive', async () => {
      maintenanceRepository.findById.mockResolvedValue({ id: 'ticket-1', assignedToId: null });
      prisma.staffProfile.findFirst.mockResolvedValue(null);

      await expect(service.assignTicket('ticket-1', { staffId: 'staff-1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should assign staff and trigger AuditService', async () => {
      maintenanceRepository.findById.mockResolvedValue({ id: 'ticket-1', assignedToId: null });
      prisma.staffProfile.findFirst.mockResolvedValue({ id: 'sp-1' });
      maintenanceRepository.update.mockResolvedValue({ id: 'ticket-1', assignedToId: 'staff-1' });

      const result = await service.assignTicket('ticket-1', { staffId: 'staff-1' });

      expect(result.assignedStaff).toBe('staff-1');
      expect(maintenanceRepository.update).toHaveBeenCalledWith('ticket-1', expect.objectContaining({ assignedToId: 'staff-1' }));
      expect(auditService.write).toHaveBeenCalledWith(expect.objectContaining({
        metadata: { event: 'ASSIGNMENT' }
      }));
    });
  });

  describe('getTicketTimeline', () => {
    it('should correctly format and sort heterogeneous events', async () => {
      maintenanceRepository.findById.mockResolvedValue({ id: 'ticket-1', createdAt: new Date('2026-01-01T10:00:00Z') });
      prisma.maintenanceComment.findMany.mockResolvedValue([{ id: 'c-1', body: 'Test', isInternal: false, createdAt: new Date('2026-01-02T10:00:00Z') }]);
      prisma.maintenanceAttachment.findMany.mockResolvedValue([{ id: 'a-1', fileName: 'test.jpg', createdAt: new Date('2026-01-03T10:00:00Z') }]);
      prisma.auditLog.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-04T10:00:00Z'), metadata: { event: 'ASSIGNMENT' }, newValues: { assignedToId: 'staff-1' } },
      ]);

      const timeline = await service.getTicketTimeline('ticket-1');

      expect(timeline.length).toBe(4);
      expect(timeline[0].type).toBe('CREATED');
      expect(timeline[1].type).toBe('COMMENT_ADDED');
      expect(timeline[2].type).toBe('ATTACHMENT_UPLOADED');
      expect(timeline[3].type).toBe('ASSIGNED');
    });
  });

  describe('Dashboard Methods', () => {
    it('should return counts', async () => {
      maintenanceRepository.count.mockResolvedValue(5);
      const count = await service.getOpenTicketsCount();
      expect(count).toBe(5);
      expect(maintenanceRepository.count).toHaveBeenCalledWith({ where: { status: 'OPEN' } });
    });

    it('should group by category', async () => {
      prisma.maintenanceTicket.groupBy.mockResolvedValue([{ categoryId: 'cat-1', _count: { id: 3 } }]);
      const res = await service.getTicketsByCategory();
      expect(res[0]._count.id).toBe(3);
    });
  });
});
