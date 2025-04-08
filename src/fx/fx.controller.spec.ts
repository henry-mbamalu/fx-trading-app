// fx.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { CurrencyParamsDto } from './dto/CurrencyParamsDto';
import { CurrencyEnum } from 'src/wallet/entities/wallet.entity';

describe('FxController', () => {
  let controller: FxController;
  let fxService: FxService;

  const mockFxService = {
    getRate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FxController],
      providers: [{ provide: FxService, useValue: mockFxService }],
    }).compile();

    controller = module.get<FxController>(FxController);
    fxService = module.get<FxService>(FxService);
  });

  it('should return fx rate', async () => {
    mockFxService.getRate.mockResolvedValue(900);

    const params: CurrencyParamsDto = { base: CurrencyEnum.USD, target: CurrencyEnum.NGN };
    const result = await controller.getRates(params);
    expect(result).toEqual({ rate: 900 });
    expect(fxService.getRate).toHaveBeenCalledWith(CurrencyEnum.USD, CurrencyEnum.NGN);
  });
});
