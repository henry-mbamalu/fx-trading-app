import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { RedisModule } from 'src/redis/redis.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        RedisModule,
        ConfigModule
    ],
    providers: [FxService],
    exports: [FxService],
})
export class FxModule { }
