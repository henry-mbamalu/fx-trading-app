// wallet.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { User, UserRole } from '../user/entities/user.entity';
import { CurrencyEnum } from './entities/wallet.entity';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { FetchWallet } from './dto/fetch-wallet.dto';

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: WalletService;

  const mockWalletService = {
    convertCurrency: jest.fn(),
    tradeCurrency: jest.fn(),
    fundWallet: jest.fn(),
    getTransactions: jest.fn(),
    findOneOrCreate: jest.fn(),
  };

  const mockUser: User = {
    id: "06358f1f-08fa-4a76-b3fd-bb8eeada05e3",
    email: "test@gmail.com",
    password: "$2b$10$PPtHuEb81t8O6QoRTJb7xOM3DTBqcJFutJf.YAlKOUyMEHIFY8yJe",
    firstName: "Test",
    lastName: "Test",
    role: UserRole.USER,
    otp: "",
    isVerified: true,
    createdAt: new Date("2025-04-07T07:39:20.453Z"),
    updatedAt: new Date("2025-04-07T07:39:20.453Z"),
    transactions: [],
    wallets: []
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: mockWalletService }],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    walletService = module.get<WalletService>(WalletService);
  });

  it('should convert currency', () => {
    const dto = { amount: 100, from: CurrencyEnum.USD, to: CurrencyEnum.NGN };
    mockWalletService.convertCurrency.mockReturnValue('converted');

    expect(controller.convertCurrency(mockUser, dto)).toBe('converted');
    expect(walletService.convertCurrency).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should trade currency', () => {
    const dto = { amount: 200, from: CurrencyEnum.NGN, to: CurrencyEnum.USD };
    mockWalletService.tradeCurrency.mockReturnValue('traded');

    expect(controller.tradeCurrency(mockUser, dto)).toBe('traded');
    expect(walletService.tradeCurrency).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should fund wallet', async () => {
    const dto: FundWalletDto = { amount: 5000 , currency: CurrencyEnum.NGN};
    mockWalletService.fundWallet.mockResolvedValue('funded');

    expect(await controller.fundWallet(mockUser, dto)).toBe('funded');
    expect(walletService.fundWallet).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should get transactions', async () => {
    const query = { page: 1, limit: 10 };
    mockWalletService.getTransactions.mockResolvedValue('transactions');

    expect(await controller.getTransactions(mockUser, query)).toBe('transactions');
    expect(walletService.getTransactions).toHaveBeenCalledWith(mockUser, 1, 10);
  });

  it('should get wallet by currency', async () => {
    const params: FetchWallet = { currency: CurrencyEnum.USD };
    mockWalletService.findOneOrCreate.mockResolvedValue('wallet');

    expect(await controller.getWalletByCurrency(mockUser, params)).toBe('wallet');
    expect(walletService.findOneOrCreate).toHaveBeenCalledWith({ user: mockUser, currency: CurrencyEnum.USD });
  });
});
