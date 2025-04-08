import { IsIn, IsNotEmpty, IsNumber } from 'class-validator';
import { CurrencyEnum } from '../entities/wallet.entity';

export class ConvertCurrencyDto {
    @IsNotEmpty()
    @IsIn(Object.keys(CurrencyEnum))
    from: CurrencyEnum;

    @IsNotEmpty()
    @IsIn(['NGN'])
    to: CurrencyEnum;

    @IsNotEmpty()
    @IsNumber()
    amount: number;
}


