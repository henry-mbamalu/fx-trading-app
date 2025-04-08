import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { Repository } from 'typeorm';
import { FxService } from 'src/fx/fx.service';
import { Wallet, CurrencyEnum } from './entities/wallet.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { User, UserRole } from 'src/user/entities/user.entity';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TradeCurrencyDto } from './dto/trade-currency.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: Repository<Wallet>;
  let transactionRepo: Repository<Transaction>;
  let fxService: FxService;

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

  const mockWalletRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    manager: {
      transaction: jest.fn().mockImplementation(async (callback) => {
        await callback({
          save: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
        });
      }),
    },
  };

  const mockTransactionRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  };

  const mockFxService = {
    getRate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: FxService,
          useValue: mockFxService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    transactionRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    fxService = module.get<FxService>(FxService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findOneOrCreate', () => {
    it('should return existing wallet if found', async () => {
      const existingWallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 100
      };

      mockWalletRepo.findOne.mockResolvedValue(existingWallet);

      const result = await service.findOneOrCreate({ user: mockUser, currency: CurrencyEnum.USD });

      expect(result).toEqual(existingWallet);
      expect(mockWalletRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: mockUser.id }, currency: CurrencyEnum.USD },
      });
      expect(mockWalletRepo.create).not.toHaveBeenCalled();
    });

    it('should create new wallet if not found', async () => {
      const newWallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 0
      };

      mockWalletRepo.findOne.mockResolvedValue(null);
      mockWalletRepo.create.mockReturnValue(newWallet);
      mockWalletRepo.save.mockResolvedValue(newWallet);

      const result = await service.findOneOrCreate({ user: mockUser, currency: CurrencyEnum.USD });

      expect(result).toEqual(newWallet);
      expect(mockWalletRepo.create).toHaveBeenCalledWith({ user: { id: mockUser.id }, currency: CurrencyEnum.USD });
      expect(mockWalletRepo.save).toHaveBeenCalledWith(newWallet);
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockWalletRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOneOrCreate({ user: mockUser, currency: CurrencyEnum.USD }))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('convertCurrency', () => {
    it('should throw BadRequestException when converting same currency', async () => {
      const dto: ConvertCurrencyDto = {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.USD,
        amount: 100,
      };

      await expect(service.convertCurrency(mockUser, dto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient balance', async () => {
      const dto: ConvertCurrencyDto = {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 1000,
      };

      mockWalletRepo.findOne.mockResolvedValue({ balance: 500 });

      await expect(service.convertCurrency(mockUser, dto))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully convert currency', async () => {
      const dto: ConvertCurrencyDto = {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      };

      const fromWallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 500
      };

      const toWallet = {
        id: 2,
        user: mockUser,
        currency: CurrencyEnum.EUR,
        balance: 0
      };

      mockWalletRepo.findOne.mockResolvedValueOnce(fromWallet);
      mockWalletRepo.findOne.mockResolvedValueOnce(toWallet);
      mockFxService.getRate.mockResolvedValue(0.85);

      const result = await service.convertCurrency(mockUser, dto);

      expect(result).toEqual({ message: "Converted successfully" });
      expect(mockWalletRepo.manager.transaction).toHaveBeenCalled();
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        user: { id: mockUser.id },
        fromCurrency: CurrencyEnum.USD,
        toCurrency: CurrencyEnum.EUR,
        amount: 100,
        rate: 0.85,
        type: TransactionType.CONVERSION,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('tradeCurrency', () => {
    it('should successfully trade currency', async () => {
      const dto: TradeCurrencyDto = {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      };

      const fromWallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 500
      };

      const toWallet = {
        id: 2,
        user: mockUser,
        currency: CurrencyEnum.EUR,
        balance: 0
      };

      mockWalletRepo.findOne.mockResolvedValueOnce(fromWallet);
      mockWalletRepo.findOne.mockResolvedValueOnce(toWallet);
      mockFxService.getRate.mockResolvedValue(0.85);

      const result = await service.tradeCurrency(mockUser, dto);

      expect(result).toEqual({ message: "Traded successfully" });
      expect(mockWalletRepo.manager.transaction).toHaveBeenCalled();
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        user: { id: mockUser.id },
        fromCurrency: CurrencyEnum.USD,
        toCurrency: CurrencyEnum.EUR,
        amount: 100,
        rate: 0.85,
        type: TransactionType.TRADE,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('fundWallet', () => {
    it('should successfully fund wallet', async () => {
      const dto: FundWalletDto = {
        amount: 100,
        currency: CurrencyEnum.USD,
      };

      const wallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 200
      };

      mockWalletRepo.findOne.mockResolvedValue(wallet);

      const result = await service.fundWallet(mockUser, dto);

      expect(result.balance).toBe(300);
      expect(mockWalletRepo.manager.transaction).toHaveBeenCalled();
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        user: { id: mockUser.id },
        fromCurrency: CurrencyEnum.USD,
        toCurrency: CurrencyEnum.USD,
        amount: 100,
        rate: 1,
        type: TransactionType.FUNDING,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getTransactions', () => {
    it('should get user transactions successfully', async () => {
      const page = 1;
      const limit = 10;
  
      const transactions = [
        { id: 1, amount: 100, type: 'CONVERSION', createdAt: new Date() },
        { id: 2, amount: 50, type: 'TRADE', createdAt: new Date() },
      ];
  
      // Mock the createQueryBuilder method to simulate the query builder functionality
      mockTransactionRepo.createQueryBuilder.mockReturnValueOnce({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([transactions, 2]),
      });
  
      const result = await service.getTransactions(mockUser, page, limit);
  
      // Check the response
      expect(result).toHaveProperty('data');
      expect(result.data.length).toBe(2); // We expect 2 transactions
      expect(result.data[0]).toHaveProperty('id', 1);
      expect(result.data[1]).toHaveProperty('id', 2);
  
      // Verify pagination-related properties
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(false);
    });
  });
});