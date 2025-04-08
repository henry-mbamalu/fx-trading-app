import { Body, Controller, Get, Param, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { loggedInUser } from 'src/common/decorators/user.decorator';
import { User } from 'src/user/entities/user.entity';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { IsVerifiedGuard } from 'src/user/guard/is-verified.guard';
import { FetchWallet } from './dto/fetch-wallet.dto';
import { TradeCurrencyDto } from './dto/trade-currency.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { ttl: 30_000, limit: 5 } }) 
@Controller('wallet')
export class WalletController {
    constructor(private readonly walletService: WalletService) { }
    
    @UseGuards(JwtAuthGuard, IsVerifiedGuard)
    @Post('convert')
    convertCurrency(@loggedInUser() user: User, @Body(new ValidationPipe()) dto: ConvertCurrencyDto) {
        return this.walletService.convertCurrency(user, dto);
    }

    @UseGuards(JwtAuthGuard, IsVerifiedGuard)
    @Post('trade')
    tradeCurrency(@loggedInUser() user: User, @Body(new ValidationPipe()) dto: TradeCurrencyDto) {
        return this.walletService.tradeCurrency(user, dto);
    }


    @UseGuards(JwtAuthGuard, IsVerifiedGuard)
    @Post('fund')
    async fundWallet(
        @loggedInUser() user: User,
        @Body() fundWalletDto: FundWalletDto,
    ) {
        return this.walletService.fundWallet(user, fundWalletDto);
    }
    @UseGuards(JwtAuthGuard, IsVerifiedGuard)
    @Get('transactions')
    async getTransactions(
        @loggedInUser() user: User,
        @Query(new ValidationPipe({ transform: true })) query: TransactionQueryDto,
    ) {
        const { page = 1, limit = 10 } = query;

        return this.walletService.getTransactions(user, +page, +limit);
    }

    @UseGuards(JwtAuthGuard, IsVerifiedGuard)
    @Get(':currency')
    async getWalletByCurrency(
        @loggedInUser() user: User,
        @Param(new ValidationPipe()) params: FetchWallet
    ) {
        const { currency } = params
        return this.walletService.findOneOrCreate({ user, currency });
    }

  
}
