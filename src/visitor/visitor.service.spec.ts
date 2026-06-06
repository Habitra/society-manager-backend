// src/visitor/visitor.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { VisitorService } from './visitor.service';
import { VisitorRepository } from './visitor.repository';
import { GatePassService } from '../gate-pass/gate-pass.service';
import { AuditService } from '../audit/audit.service';
import { VisitorEntryMode, VisitorType, VisitorRequestStatus } from '@prisma/client';

describe('VisitorService', () => {
  let service: VisitorService;
  let repository: jest.Mocked<VisitorRepository>;
  let gatePassService: jest.Mocked<GatePassService>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const mockGatePass = {
      generatePass: jest.fn(),
    };

    const mockAudit = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorService,
        { provide: VisitorRepository, useValue: mockRepo },
        { provide: GatePassService, useValue: mockGatePass },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<VisitorService>(VisitorService);
    repository = module.get(VisitorRepository);
    gatePassService = module.get(GatePassService);
  });

  it('should create PRE_APPROVED request and generate pass', async () => {
    repository.create.mockResolvedValue({ id: '1', status: VisitorRequestStatus.APPROVED } as any);
    gatePassService.generatePass.mockResolvedValue({} as any);

    const result = await service.createRequest({
      unitId: 'unit1',
      visitorName: 'John',
      visitorType: VisitorType.GUEST,
      entryMode: VisitorEntryMode.PRE_APPROVED,
      validFrom: new Date(),
    }, 'user1');

    expect(result.id).toBe('1');
    expect(gatePassService.generatePass).toHaveBeenCalled();
  });

  it('should create ON_ARRIVAL request without generating pass', async () => {
    repository.create.mockResolvedValue({ id: '1', status: VisitorRequestStatus.PENDING } as any);

    const result = await service.createRequest({
      unitId: 'unit1',
      visitorName: 'John',
      visitorType: VisitorType.GUEST,
      entryMode: VisitorEntryMode.ON_ARRIVAL,
      validFrom: new Date(),
    }, 'guard1');

    expect(result.id).toBe('1');
    expect(gatePassService.generatePass).not.toHaveBeenCalled();
  });
});
