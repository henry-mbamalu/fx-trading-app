import { Controller, Get, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { FxService } from './fx.service';
import { CurrencyParamsDto } from './dto/CurrencyParamsDto';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { IsVerifiedGuard } from 'src/user/guard/is-verified.guard';

@Controller('fx')
export class FxController {
    constructor(private readonly fxService: FxService) { }

    @UseGuards(JwtAuthGuard,IsVerifiedGuard)
    @Get('rates/:base/:target')
    async getRates(
        @Param(new ValidationPipe()) params: CurrencyParamsDto,
    ) {

        const { base, target } = params;
        const rate = await this.fxService.getRate(base, target);

        return { rate }
    }
}
