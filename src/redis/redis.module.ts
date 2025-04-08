import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const client = createClient({
          url: configService.get('REDIS_URL') || 'redis://localhost:6379',
            password: configService.get('REDIS_PASSWORD') || '',
        });
        
        await client.connect();
        return client;
      }
    },
    RedisService
  ],
  exports: ['REDIS_CLIENT', RedisService]
})
export class RedisModule { }
