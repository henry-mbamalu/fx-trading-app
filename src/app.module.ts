import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletModule } from './wallet/wallet.module';
import { FxController } from './fx/fx.controller';
import { FxService } from './fx/fx.service';
import { FxModule } from './fx/fx.module';
import typeorm from './config/typeorm';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';
import { SeederService } from './seeder/seeder.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [typeorm]
  }),
  TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => (configService.get('typeorm')!),
  }), AuthModule, WalletModule, FxModule, RedisModule, UserModule, ThrottlerModule.forRoot([{
    ttl: 60_000, // Time-to-live in milliseconds (1 minute)
    limit: 10,    // Max requests per ttl window
  }])],
  controllers: [AppController, FxController],
  providers: [AppService, FxService, SeederService,  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }],
})
export class AppModule { }
