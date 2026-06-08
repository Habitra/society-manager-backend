import { Test, TestingModule } from '@nestjs/testing';
import { LookupService } from './lookup.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { UserStatus } from '@prisma/client';

describe('LookupService', () => {
  let service: LookupService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      residentUnitAssignment: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LookupService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: { communityId: 'test-community' } },
      ],
    }).compile();

    service = module.get<LookupService>(LookupService);
  });

  it('should filter resident lookups accurately and enforce tenant isolation', async () => {
    prisma.residentUnitAssignment.findMany.mockResolvedValue([
      {
        userId: '1',
        user: { displayName: 'John Doe' },
        unit: { unitNumber: 'A-101' },
      }
    ]);

    const result = await service.getResidents();
    expect(prisma.residentUnitAssignment.findMany).toHaveBeenCalledWith({
      where: {
        communityId: 'test-community',
        deletedAt: null,
        user: { status: UserStatus.ACTIVE, deletedAt: null },
      },
      select: expect.any(Object),
      orderBy: expect.any(Object),
    });

    expect(result).toEqual([
      {
        id: '1',
        displayName: 'John Doe',
        unitNumber: 'A-101'
      }
    ]);
  });
});
