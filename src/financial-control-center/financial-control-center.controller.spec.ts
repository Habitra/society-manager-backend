import { Test, TestingModule } from '@nestjs/testing';
import { FinancialControlCenterController } from './financial-control-center.controller';

describe('FinancialControlCenterController', () => {
  let controller: FinancialControlCenterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialControlCenterController],
    }).compile();

    controller = module.get<FinancialControlCenterController>(FinancialControlCenterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
