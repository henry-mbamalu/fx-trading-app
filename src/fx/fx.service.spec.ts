import { Test, TestingModule } from '@nestjs/testing';
import { FxService } from './fx.service';
import { RedisService } from 'src/redis/redis.service';
import axios from 'axios';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Mocking the entire axios module
jest.mock('axios');

describe('FxService', () => {
  let service: FxService;
  let redisServiceMock: RedisService;
  let redisClientMock: any; // This will be a mock for the redis client

  beforeEach(async () => {
    redisClientMock = {
      get: jest.fn(),
      set: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        {
          provide: RedisService,
          useValue: {
            get: redisClientMock.get,
            set: redisClientMock.set,
            expire: redisClientMock.expire,
            del: redisClientMock.del,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'RATE_API_URL') return 'https://open.er-api.com';
              return null;
            }),
          },
        }
      ],
    }).compile();

    service = module.get<FxService>(FxService);
    redisServiceMock = module.get<RedisService>(RedisService);
  });

  describe('getRate', () => {
    it('should return the exchange rate from cache if available', async () => {
      const base = 'USD';
      const target = 'EUR';
      const cachedRate = '0.85'; // Cached value

      // Mock Redis get to return a cached value
      redisClientMock.get.mockResolvedValue(cachedRate);

      const rate = await service.getRate(base, target);

      expect(rate).toBe(parseFloat(cachedRate)); // Expect the rate to be the cached value
      expect(redisClientMock.get).toHaveBeenCalledWith(`fx:${base}-${target}`);
      expect(axios.get).not.toHaveBeenCalled(); // Ensure axios is not called
    });

    it('should fetch the exchange rate from API and cache it when not available in cache', async () => {
      const base = 'USD';
      const target = 'EUR';
      const rateFromApi = 0.85;
    
      // Mock Redis get to return null (i.e., no cache hit)
      redisClientMock.get.mockResolvedValue(null);
    
      // Mock the axios request to return the rate
      (axios.get as jest.Mock).mockResolvedValue({
        data: {
          rates: {
            EUR: rateFromApi,
          },
        },
      });
    
      // Mock Redis set to simulate caching the result
      redisClientMock.set.mockResolvedValue(undefined);
    
      const rate = await service.getRate(base, target);
    
      expect(rate).toBe(rateFromApi); // Ensure the rate is fetched from API
      expect(axios.get).toHaveBeenCalledWith(`https://open.er-api.com/v6/latest/${base}`);
    
      // Expect Redis set to be called with the key, rate, and EX option
      expect(redisClientMock.set).toHaveBeenCalledWith(
        `fx:${base}-${target}`,
        rateFromApi,
        300
      );
    });

    it('should throw an InternalServerErrorException if there is an error fetching the rate', async () => {
      const base = 'USD';
      const target = 'EUR';

      // Simulate an axios error
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(service.getRate(base, target)).rejects.toThrow(InternalServerErrorException);
      expect(axios.get).toHaveBeenCalledWith(`https://open.er-api.com/v6/latest/${base}`);
    });

    it('should throw an InternalServerErrorException if Redis fails to get or set', async () => {
      const base = 'USD';
      const target = 'EUR';

      // Simulate Redis get failure
      redisClientMock.get.mockRejectedValue(new Error('Redis Error'));

      await expect(service.getRate(base, target)).rejects.toThrow(InternalServerErrorException);
      expect(redisClientMock.get).toHaveBeenCalledWith(`fx:${base}-${target}`);
    });
  });
});
