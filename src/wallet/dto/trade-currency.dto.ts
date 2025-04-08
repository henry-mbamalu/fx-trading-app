import { IsIn, IsNotEmpty, IsNumber } from 'class-validator';
import { CurrencyEnum } from '../entities/wallet.entity';

export class TradeCurrencyDto {
    @IsNotEmpty()
    @IsIn(['NGN'])
    from: CurrencyEnum;

    @IsNotEmpty()
    @IsIn(Object.keys(CurrencyEnum))
    to: CurrencyEnum;

    @IsNotEmpty()
    @IsNumber()
    amount: number;
}


