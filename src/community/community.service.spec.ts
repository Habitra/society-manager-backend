// src/community/community.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from './community.service';
import { CommunityRepository } from './community.repository';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, CommunityType } from '@prisma/client';

describe('CommunityService', () => {
  let service: CommunityService;
  let repository: jest.Mocked<CommunityRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockRepository = {
      findBySlug: jest.fn(),
      createCommunity: jest.fn(),
      findAllPaginated: jest.fn(),
      findByIdGlobal: jest.fn(),
      updateCommunity: jest.fn(),
      getOwnCommunity: jest.fn(),
    };

    const mockAuditService = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: CommunityRepository, useValue: mockRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
    repository = module.get(CommunityRepository);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCommunity', () => {
    it('should create a community', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.createCommunity.mockResolvedValue({ id: '1', slug: 'test' } as any);

      const result = await service.createCommunity({
        name: 'Test',
        code: 'TST',
        slug: 'test',
        type: CommunityType.APARTMENT_COMPLEX,
        address: {} as any,
        contactEmail: 'test@test.com',
        contactPhone: '123',
      }, 'admin1');

      expect(result.id).toBe('1');
      expect(repository.createCommunity).toHaveBeenCalled();
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.CREATE }),
      );
    });

    it('should throw conflict if slug exists', async () => {
      repository.findBySlug.mockResolvedValue({ id: '1' } as any);

      await expect(service.createCommunity({
        name: 'Test',
        code: 'TST',
        slug: 'test',
        type: CommunityType.APARTMENT_COMPLEX,
        address: {} as any,
        contactEmail: 'test@test.com',
        contactPhone: '123',
      }, 'admin1')).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCommunity', () => {
    it('should soft delete community', async () => {
      repository.findByIdGlobal.mockResolvedValue({ id: '1' } as any);
      repository.updateCommunity.mockResolvedValue({ id: '1' } as any);

      await service.deleteCommunity('1', 'admin1');

      expect(repository.updateCommunity).toHaveBeenCalledWith('1', expect.objectContaining({ deletedAt: expect.any(Date) }));
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.SOFT_DELETE }),
      );
    });
  });
});
