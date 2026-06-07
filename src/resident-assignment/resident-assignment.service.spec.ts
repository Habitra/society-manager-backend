// src/resident-assignment/resident-assignment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ResidentAssignmentService } from './resident-assignment.service';
import { ResidentAssignmentRepository } from './resident-assignment.repository';
import { UnitRepository } from '../unit/unit.repository';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, OccupancyType } from '@prisma/client';

describe('ResidentAssignmentService', () => {
  let service: ResidentAssignmentService;
  let assignmentRepository: jest.Mocked<ResidentAssignmentRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockAssignmentRepo = {
      findActiveAssignment: jest.fn(),
      findPrimaryForUnit: jest.fn(),
      clearPrimaryForUnit: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
      findByUnit: jest.fn(),
      findByUser: jest.fn(),
      update: jest.fn(),
    };

    const mockUnitRepo = {
      exists: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
      },
    };

    const mockAuditService = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResidentAssignmentService,
        { provide: ResidentAssignmentRepository, useValue: mockAssignmentRepo },
        { provide: UnitRepository, useValue: mockUnitRepo },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ResidentAssignmentService>(ResidentAssignmentService);
    assignmentRepository = module.get(ResidentAssignmentRepository);
    unitRepository = module.get(UnitRepository);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignResident', () => {
    it('should assign a resident', async () => {
      unitRepository.exists.mockResolvedValue(true);
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user1' });
      assignmentRepository.findActiveAssignment.mockResolvedValue(null);
      assignmentRepository.findPrimaryForUnit.mockResolvedValue({ id: '2' } as any);
      assignmentRepository.create.mockResolvedValue({ id: '1', userId: 'user1', unitId: 'unit1' } as any);

      const result = await service.assignResident({
        userId: 'user1',
        unitId: 'unit1',
        occupancyType: OccupancyType.TENANT,
        isPrimary: false,
      }, 'admin1');

      expect(result.id).toBe('1');
      expect(assignmentRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if unit missing', async () => {
      unitRepository.exists.mockResolvedValue(false);

      await expect(service.assignResident({
        userId: 'user1',
        unitId: 'unit1',
        occupancyType: OccupancyType.TENANT,
      }, 'admin1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAssignment', () => {
    it('should remove and promote another if primary', async () => {
      assignmentRepository.findById.mockResolvedValue({ id: '1', isPrimary: true, unitId: 'unit1' } as any);
      assignmentRepository.softDelete.mockResolvedValue({} as any);
      assignmentRepository.findByUnit.mockResolvedValue([{ id: '2' }] as any);
      assignmentRepository.update.mockResolvedValue({} as any);

      await service.removeAssignment('1', 'admin1');

      expect(assignmentRepository.softDelete).toHaveBeenCalledWith('1');
      expect(assignmentRepository.update).toHaveBeenCalledWith('2', { isPrimary: true });
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.SOFT_DELETE }),
      );
    });
  });
});
