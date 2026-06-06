// src/unit/unit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnitService } from './unit.service';
import { UnitRepository } from './unit.repository';
import { TowerRepository } from '../tower/tower.repository';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

describe('UnitService', () => {
  let service: UnitService;
  let unitRepository: jest.Mocked<UnitRepository>;
  let towerRepository: jest.Mocked<TowerRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockUnitRepo = {
      findByUnitNumber: jest.fn(),
      create: jest.fn(),
      findPaginated: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      exists: jest.fn(),
    };

    const mockTowerRepo = {
      exists: jest.fn(),
    };

    const mockAuditService = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitService,
        { provide: UnitRepository, useValue: mockUnitRepo },
        { provide: TowerRepository, useValue: mockTowerRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UnitService>(UnitService);
    unitRepository = module.get(UnitRepository);
    towerRepository = module.get(TowerRepository);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUnit', () => {
    it('should create a unit if tower exists', async () => {
      towerRepository.exists.mockResolvedValue(true);
      unitRepository.findByUnitNumber.mockResolvedValue(null);
      unitRepository.create.mockResolvedValue({ id: '1', unitNumber: '101' } as any);

      const result = await service.createUnit({ unitNumber: '101', towerId: 'tower1' }, 'user1');

      expect(result.id).toBe('1');
      expect(unitRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tower does not exist', async () => {
      towerRepository.exists.mockResolvedValue(false);

      await expect(service.createUnit({ unitNumber: '101', towerId: 'tower1' }, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteUnit', () => {
    it('should soft delete unit', async () => {
      unitRepository.softDelete.mockResolvedValue({} as any);

      await service.deleteUnit('1', 'user1');

      expect(unitRepository.softDelete).toHaveBeenCalledWith('1');
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.SOFT_DELETE }),
      );
    });
  });
});
