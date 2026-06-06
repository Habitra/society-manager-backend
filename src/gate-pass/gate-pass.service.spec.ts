// src/gate-pass/gate-pass.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GatePassService } from './gate-pass.service';
import { GatePassRepository } from './gate-pass.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GatePassStatus } from '@prisma/client';

describe('GatePassService', () => {
  let service: GatePassService;
  let repository: jest.Mocked<GatePassRepository>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findByPassCodeOrToken: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatePassService,
        { provide: GatePassRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<GatePassService>(GatePassService);
    repository = module.get(GatePassRepository);
  });

  it('should generate a pass', async () => {
    repository.create.mockResolvedValue({ id: '1', passCode: 'ABCDEF', qrToken: 'token' } as any);

    const result = await service.generatePass('req1', new Date());

    expect(result.id).toBe('1');
    expect(repository.create).toHaveBeenCalled();
  });

  it('should validate an active pass', async () => {
    const expiresAt = new Date(Date.now() + 10000); // future
    repository.findByPassCodeOrToken.mockResolvedValue({ id: '1', status: GatePassStatus.APPROVED, expiresAt } as any);

    const result = await service.validatePass('ABCDEF');

    expect(result.id).toBe('1');
  });

  it('should throw if pass expired', async () => {
    const expiresAt = new Date(Date.now() - 10000); // past
    repository.findByPassCodeOrToken.mockResolvedValue({ id: '1', status: GatePassStatus.APPROVED, expiresAt } as any);
    repository.update.mockResolvedValue({} as any);

    await expect(service.validatePass('ABCDEF')).rejects.toThrow(BadRequestException);
    expect(repository.update).toHaveBeenCalledWith('1', { status: GatePassStatus.EXPIRED });
  });
});
