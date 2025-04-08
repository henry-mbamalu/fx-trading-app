import { IsIn } from 'class-validator';
import { CurrencyEnum } from 'src/wallet/entities/wallet.entity';

export class CurrencyParamsDto {
  @IsIn(Object.keys(CurrencyEnum)) 
  base: CurrencyEnum;

  @IsIn(Object.keys(CurrencyEnum))
  target: CurrencyEnum;
}