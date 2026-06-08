import { Test, TestingModule } from '@nestjs/testing';
import { FinancialControlCenterService } from './financial-control-center.service';

describe('FinancialControlCenterService', () => {
  let service: FinancialControlCenterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancialControlCenterService],
    }).compile();

    service = module.get<FinancialControlCenterService>(FinancialControlCenterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
