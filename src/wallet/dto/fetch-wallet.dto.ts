import { IsIn, IsNotEmpty } from 'class-validator';
import { CurrencyEnum } from '../entities/wallet.entity';

export class FetchWallet {
    @IsNotEmpty()
    @IsIn(Object.keys(CurrencyEnum))
    currency: CurrencyEnum;
}
