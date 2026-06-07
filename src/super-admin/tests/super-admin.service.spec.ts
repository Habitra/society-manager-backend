import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminService } from '../super-admin.service';
import { SuperAdminRepository } from '../super-admin.repository';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockSuperAdminRepo = {
  countCommunities: jest.fn(),
  countActiveCommunities: jest.fn(),
  countInactiveCommunities: jest.fn(),
  countTowers: jest.fn(),
  countUnits: jest.fn(),
  countResidents: jest.fn(),
  countCommunityAdmins: jest.fn(),
  getCommunityById: jest.fn(),
  updateCommunityStatus: jest.fn(),
  getCommunityAdminById: jest.fn(),
};

const mockAuditService = {
  write: jest.fn(),
};

const mockPrismaService = {
  $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
  user: {
    update: jest.fn(),
  },
};

describe('SuperAdminService', () => {
  let service: SuperAdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: SuperAdminRepository, useValue: mockSuperAdminRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
  });

  describe('getDashboardStats', () => {
    it('should return aggregated stats', async () => {
      mockSuperAdminRepo.countCommunities.mockResolvedValue(10);
      mockSuperAdminRepo.countActiveCommunities.mockResolvedValue(8);
      mockSuperAdminRepo.countInactiveCommunities.mockResolvedValue(2);
      mockSuperAdminRepo.countTowers.mockResolvedValue(20);
      mockSuperAdminRepo.countUnits.mockResolvedValue(500);
      mockSuperAdminRepo.countResidents.mockResolvedValue(1200);
      mockSuperAdminRepo.countCommunityAdmins.mockResolvedValue(15);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        communities: 10,
        activeCommunities: 8,
        inactiveCommunities: 2,
        towers: 20,
        units: 500,
        residents: 1200,
        communityAdmins: 15,
      });
    });
  });

  describe('activateCommunity', () => {
    it('should set community status to ACTIVE and create audit log', async () => {
      const communityId = 'comm-123';
      const actorId = 'actor-456';
      mockSuperAdminRepo.getCommunityById.mockResolvedValue({ id: communityId, status: 'PENDING' });
      mockSuperAdminRepo.updateCommunityStatus.mockResolvedValue({ id: communityId, status: 'ACTIVE' });

      const result = await service.activateCommunity(communityId, actorId);

      expect(result.status).toBe('ACTIVE');
      expect(mockAuditService.write).toHaveBeenCalledWith(expect.objectContaining({
        communityId,
        actorId,
        action: 'UPDATE',
        newValues: { status: 'ACTIVE' },
      }));
    });
  });

  describe('createCommunityAdmin', () => {
    it('should execute transaction and return credentials', async () => {
      const dto = {
        communityId: 'comm-123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        email: 'john@example.com',
      };
      const actorId = 'actor-456';

      mockSuperAdminRepo.getCommunityById.mockResolvedValue({ id: 'comm-123', code: 'JPA' });
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          usernameSequence: {
            upsert: jest.fn().mockResolvedValue({ nextValue: 2 }),
          },
          user: {
            create: jest.fn().mockResolvedValue({ id: 'user-789', username: 'JPA-000001' }),
          },
          auditLog: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await service.createCommunityAdmin(dto, actorId);

      expect(result.username).toBe('JPA-000001');
      expect(result.temporaryPassword).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
