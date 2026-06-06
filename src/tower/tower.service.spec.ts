// src/tower/tower.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TowerService } from './tower.service';
import { TowerRepository } from './tower.repository';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

describe('TowerService', () => {
  let service: TowerService;
  let repository: jest.Mocked<TowerRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockRepository = {
      findByCode: jest.fn(),
      create: jest.fn(),
      findAllTowers: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockAuditService = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TowerService,
        { provide: TowerRepository, useValue: mockRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TowerService>(TowerService);
    repository = module.get(TowerRepository);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTower', () => {
    it('should create a tower successfully', async () => {
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue({ id: '1', code: 'A', name: 'Tower A' } as any);

      const result = await service.createTower({ name: 'Tower A', code: 'A' }, 'user1');

      expect(result.id).toBe('1');
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'A' }));
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.CREATE }),
      );
    });

    it('should throw ConflictException if code exists', async () => {
      repository.findByCode.mockResolvedValue({ id: '1', code: 'A' } as any);

      await expect(service.createTower({ name: 'Tower A', code: 'A' }, 'user1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteTower', () => {
    it('should soft delete tower', async () => {
      repository.softDelete.mockResolvedValue({} as any);

      await service.deleteTower('1', 'user1');

      expect(repository.softDelete).toHaveBeenCalledWith('1');
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.SOFT_DELETE }),
      );
    });
  });
});
