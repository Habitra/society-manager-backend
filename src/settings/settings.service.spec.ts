import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      community: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: { communityId: 'test-community' } },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should update community logo with tenant isolation', async () => {
    const logoUrl = 'http://localhost:3000/uploads/logo.png';
    prisma.community.update.mockResolvedValue({ logoUrl });

    const result = await service.updateCommunityLogo(logoUrl);
    expect(prisma.community.update).toHaveBeenCalledWith({
      where: { id: 'test-community' },
      data: { logoUrl },
      select: expect.any(Object),
    });
    expect(result.logoUrl).toBe(logoUrl);
  });
});
