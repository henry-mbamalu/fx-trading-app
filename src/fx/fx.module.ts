import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
    imports: [
        RedisModule
    ],
    providers: [FxService],
    exports: [FxService],
})
export class FxModule { }
