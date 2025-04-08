import { IsOptional, IsNumberString } from 'class-validator';

export class TransactionQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;
}
