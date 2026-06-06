// src/gate-entry/gate-entry.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GateEntryService } from './gate-entry.service';
import { GateEntryRepository } from './gate-entry.repository';
import { GatePassService } from '../gate-pass/gate-pass.service';
import { VisitorRepository } from '../visitor/visitor.repository';
import { VisitorRequestStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('GateEntryService', () => {
  let service: GateEntryService;
  let entryRepo: jest.Mocked<GateEntryRepository>;
  let gatePassService: jest.Mocked<GatePassService>;
  let visitorRepo: jest.Mocked<VisitorRepository>;

  beforeEach(async () => {
    const mockEntryRepo = {
      findActiveEntryByVisitor: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };
    const mockGatePass = { validatePass: jest.fn() };
    const mockVisitor = { findById: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateEntryService,
        { provide: GateEntryRepository, useValue: mockEntryRepo },
        { provide: GatePassService, useValue: mockGatePass },
        { provide: VisitorRepository, useValue: mockVisitor },
      ],
    }).compile();

    service = module.get<GateEntryService>(GateEntryService);
    entryRepo = module.get(GateEntryRepository);
    gatePassService = module.get(GatePassService);
    visitorRepo = module.get(VisitorRepository);
  });

  it('should record entry using gatePassId', async () => {
    gatePassService.validatePass.mockResolvedValue({ visitorRequestId: 'req1' } as any);
    visitorRepo.findById.mockResolvedValue({ status: VisitorRequestStatus.APPROVED } as any);
    entryRepo.findActiveEntryByVisitor.mockResolvedValue(null);
    entryRepo.create.mockResolvedValue({ id: 'entry1' } as any);

    const result = await service.recordEntry({
      gatePassId: 'pass1',
      visitorName: 'John',
    }, 'guard1');

    expect(result.id).toBe('entry1');
    expect(visitorRepo.update).toHaveBeenCalledWith('req1', { status: VisitorRequestStatus.ENTERED });
  });

  it('should block entry if visitor request not approved', async () => {
    visitorRepo.findById.mockResolvedValue({ status: VisitorRequestStatus.PENDING } as any);

    await expect(service.recordEntry({
      visitorRequestId: 'req1',
      visitorName: 'John',
    }, 'guard1')).rejects.toThrow(BadRequestException);
  });
});
