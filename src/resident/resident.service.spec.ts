import { Test, TestingModule } from '@nestjs/testing';
import { ResidentService } from './resident.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { ResidentRepository } from './resident.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OccupancyType, UserStatus } from '@prisma/client';

describe('ResidentService', () => {
  let service: ResidentService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let residentRepository: jest.Mocked<ResidentRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest.fn(),
      unit: { findFirst: jest.fn() },
    };
    const mockTenantContext = { communityId: 'comm-123' };
    const mockAudit = { write: jest.fn() };
    const mockRepo = {
      emailExists: jest.fn(),
      phoneExists: jest.fn(),
      findResidentById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResidentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: AuditService, useValue: mockAudit },
        { provide: ResidentRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ResidentService>(ResidentService);
    prismaService = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    residentRepository = module.get(ResidentRepository);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createResident', () => {
    it('should create a resident with generated credentials', async () => {
      residentRepository.emailExists.mockResolvedValue(false);
      residentRepository.phoneExists.mockResolvedValue(false);
      (prismaService.unit.findFirst as jest.Mock).mockResolvedValue({ id: 'unit-1' });

      // Mock the transaction to execute the callback immediately
      (prismaService.$transaction as jest.Mock).mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          const mockTx = {
            community: { findUniqueOrThrow: jest.fn().mockResolvedValue({ code: 'TEST' }) },
            usernameSequence: { upsert: jest.fn().mockResolvedValue({ nextValue: 2 }) },
            user: { create: jest.fn().mockResolvedValue({
              id: 'user-1', username: 'TEST-000001', email: 'test@example.com',
              residentProfile: { id: 'prof-1' },
              residentAssignments: [{ unitId: 'unit-1', occupancyType: OccupancyType.TENANT, unit: {} }]
            }) },
          };
          return cb(mockTx);
        }
      });

      const dto = {
        firstName: 'John', lastName: 'Doe', phone: '1234567890',
        email: 'test@example.com', unitId: 'unit-1', occupancyType: OccupancyType.TENANT,
      };

      const result = await service.createResident(dto, 'admin-1');

      expect(result.credentials.username).toBe('TEST-000001');
      expect(result.credentials.temporaryPassword).toBeDefined();
      expect(result.resident.id).toBe('user-1');
      expect(auditService.write).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      residentRepository.emailExists.mockResolvedValue(true);
      await expect(service.createResident({ email: 'test@example.com' } as any, 'admin-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('activate/deactivate resident', () => {
    it('should activate resident', async () => {
      residentRepository.findResidentById.mockResolvedValue({ id: 'u1', status: UserStatus.INACTIVE, residentProfile: {}, residentAssignments: [] } as any);
      residentRepository.update.mockResolvedValue({} as any);

      const result = await service.activateResident('u1', 'admin');
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(auditService.write).toHaveBeenCalled();
    });

    it('should deactivate resident', async () => {
      residentRepository.findResidentById.mockResolvedValue({ id: 'u1', status: UserStatus.ACTIVE, residentProfile: {}, residentAssignments: [] } as any);
      residentRepository.update.mockResolvedValue({} as any);

      const result = await service.deactivateResident('u1', 'admin');
      expect(result.status).toBe(UserStatus.INACTIVE);
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      residentRepository.findResidentById.mockResolvedValue({ id: 'u1', residentProfile: {}, residentAssignments: [] } as any);
      residentRepository.update.mockResolvedValue({} as any);

      const result = await service.resetPassword('u1', 'admin');
      expect(result.temporaryPassword).toBeDefined();
      expect(residentRepository.update).toHaveBeenCalledWith('u1', expect.objectContaining({ mustChangePassword: true }));
      expect(auditService.write).toHaveBeenCalled();
    });
  });
});
