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
import { RedisService } from 'src/redis/redis.service';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: Repository<Wallet>;
  let transactionRepo: Repository<Transaction>;
  let fxService: FxService;
  let redisService: RedisService;

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

  const mockRedisService = {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
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
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    transactionRepo = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    fxService = module.get<FxService>(FxService);
    redisService = module.get<RedisService>(RedisService); // in case you want to test it directly

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
    it('should throw when lock cannot be acquired', async () => {
      mockRedisService.acquireLock.mockResolvedValue(null);

      await expect(service.convertCurrency(mockUser, {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      })).rejects.toThrow('System Busy');
    });

    it('should throw BadRequestException when converting same currency', async () => {
      mockRedisService.acquireLock.mockResolvedValue('lock123');

      await expect(service.convertCurrency(mockUser, {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.USD,
        amount: 100,
      })).rejects.toThrow(BadRequestException);

      expect(mockRedisService.releaseLock).toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient balance', async () => {
      mockRedisService.acquireLock.mockResolvedValue('lock123');
      mockWalletRepo.findOne.mockResolvedValue({ balance: 50 });

      await expect(service.convertCurrency(mockUser, {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      })).rejects.toThrow(BadRequestException);

      expect(mockRedisService.releaseLock).toHaveBeenCalled();
    });

    it('should successfully convert currency', async () => {
      mockRedisService.acquireLock.mockResolvedValue('lock123');

      const fromWallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 500,
      };

      const toWallet = {
        id: 2,
        user: mockUser,
        currency: CurrencyEnum.EUR,
        balance: 0,
      };

      mockWalletRepo.findOne.mockResolvedValueOnce(fromWallet);
      mockFxService.getRate.mockResolvedValue(0.85);
      service.findOneOrCreate = jest.fn().mockResolvedValue(toWallet);

      const result = await service.convertCurrency(mockUser, {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      });

      expect(result).toEqual({ message: "Converted successfully" });
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(`user:${mockUser.id}`, 'lock123');
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.CONVERSION,
      }));
    });
  });

  describe('tradeCurrency', () => {
    it('should throw when lock cannot be acquired', async () => {
      mockRedisService.acquireLock.mockResolvedValue(null);

      await expect(service.tradeCurrency(mockUser, {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      })).rejects.toThrow('System Busy');
    });

    it('should trade successfully', async () => {
      mockRedisService.acquireLock.mockResolvedValue('lock456');

      const fromWallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 500,
      };

      const toWallet = {
        id: 2,
        user: mockUser,
        currency: CurrencyEnum.EUR,
        balance: 0,
      };

      mockWalletRepo.findOne.mockResolvedValueOnce(fromWallet);
      mockFxService.getRate.mockResolvedValue(0.85);
      service.findOneOrCreate = jest.fn().mockResolvedValue(toWallet);

      const result = await service.tradeCurrency(mockUser, {
        from: CurrencyEnum.USD,
        to: CurrencyEnum.EUR,
        amount: 100,
      });

      expect(result).toEqual({ message: "Traded successfully" });
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.TRADE,
      }));
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(`user:${mockUser.id}`, 'lock456');
    });
  });

  describe('fundWallet', () => {
    it('should throw when lock cannot be acquired', async () => {
      mockRedisService.acquireLock.mockResolvedValue(null);

      await expect(service.fundWallet(mockUser, {
        amount: 100,
        currency: CurrencyEnum.USD,
      })).rejects.toThrow('System Busy');
    });

    it('should successfully fund wallet', async () => {
      mockRedisService.acquireLock.mockResolvedValue('lock789');

      const wallet = {
        id: 1,
        user: mockUser,
        currency: CurrencyEnum.USD,
        balance: 200,
      };

      service.findOneOrCreate = jest.fn().mockResolvedValue(wallet);

      const result = await service.fundWallet(mockUser, {
        amount: 100,
        currency: CurrencyEnum.USD,
      });

      expect(result.balance).toBe(300);
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: TransactionType.FUNDING,
      }));
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(`user:${mockUser.id}`, 'lock789');
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