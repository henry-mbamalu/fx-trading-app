import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class FxService {
    private readonly logger = new Logger(FxService.name);
    constructor(private readonly redis: RedisService) { }

    async getRate(base: string, target: string): Promise<number> {
        try {
            const key = `fx:${base}-${target}`;
            const cached = await this.redis.get(key);
            console.log(cached)

            if (cached) return parseFloat(cached);

            const { data } = await axios.get(`https://open.er-api.com/v6/latest/${base}`);
            const rate = data.rates[target];
            await this.redis.set(key, rate, 300); // Cache 5 mins
            return rate;
        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }

    }


}
