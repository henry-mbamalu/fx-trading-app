import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  private readonly LOCK_PREFIX = 'lock:';
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType
  ) {}

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.redis.set(key, value);
    if (ttl) {
      await this.redis.expire(key, ttl);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async acquireLock(
    key: string,
    ttl = 5000,
    retryDelay = 100,
    maxRetries = 10
  ): Promise<string | null> {
    const lockKey = `${this.LOCK_PREFIX}${key}`;
    const lockId = Math.random().toString(36).substring(2, 12);
    
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const result = await this.redis.set(lockKey, lockId, {
          NX: true,  // Only set if not exists
          PX: ttl     // Set expiration in ms
        });

        if (result === 'OK') {
          console.log(`Lock acquired for ${key}`)
          return lockId;
        }

        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.log(`Error acquiring lock for ${key}`, error)
        throw error;
      }
    }

    console.log(`Failed to acquire lock for ${key} after ${maxRetries} retries`)
    return null;
  }

  async releaseLock(key: string, lockId: string): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${key}`;

    try {
      // Lua script to ensure atomic check-and-delete
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, {
        keys: [lockKey],
        arguments: [lockId]
      });

      if (result === 1) {
        console.log(`Lock released for ${key}`);
      } else {
        console.log(`Lock release failed for ${key} - lock ID mismatch or expired`);
      }
    } catch (error) {
      console.log(`Error releasing lock for ${key}`, error);
      throw error;
    }
  }


}