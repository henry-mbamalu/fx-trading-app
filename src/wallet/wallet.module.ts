import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { FxModule } from 'src/fx/fx.module';
import { Transaction } from './entities/transaction.entity';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction]), FxModule, RedisModule],
  providers: [WalletService],
  controllers: [WalletController]
})
export class WalletModule { }
