import { IsIn, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { CurrencyEnum } from '../entities/wallet.entity';

export class FundWalletDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNotEmpty()
  @IsIn(Object.keys(CurrencyEnum))
  currency: CurrencyEnum;
}
