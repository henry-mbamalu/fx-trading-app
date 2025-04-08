import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CurrencyEnum, Wallet } from './entities/wallet.entity';
import { Repository } from 'typeorm';
import { FxService } from 'src/fx/fx.service';
import { User, UserRole } from 'src/user/entities/user.entity';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FundWalletDto } from './dto/fund-wallet.dto';
import Decimal from 'decimal.js';
import { TradeCurrencyDto } from './dto/trade-currency.dto';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);
    constructor(
        @InjectRepository(Wallet)
        private readonly walletRepo: Repository<Wallet>,
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,
        private readonly fxService: FxService,
        private readonly redisService: RedisService
    ) { }

    async findOneOrCreate(data: { user: User, currency: CurrencyEnum }): Promise<Wallet> {
        try {
            const { user, currency } = data


            let wallet = await this.walletRepo.findOne({
                where: { user: { id: user.id }, currency },
            });


            if (!wallet) {
                wallet = this.walletRepo.create({ user: { id: user.id }, currency });
                await this.walletRepo.save(wallet);
            }

            return wallet;
        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }

    async convertCurrency(user: User, dto: ConvertCurrencyDto) {
        const lockId = await this.redisService.acquireLock(`user:${user.id}`);

        if (lockId) {
            try {

                if (dto.from === dto.to) {
                    throw new BadRequestException("You can't convert to the same currency");
                }

                const { amount, from, to } = dto
                const _amount = new Decimal(amount)
                const userWalletFrom = await this.walletRepo.findOne({ where: { user: { id: user.id }, currency: from } });

                const _balanceFrom = new Decimal(userWalletFrom?.balance || 0)

                if (!userWalletFrom || _balanceFrom.lessThan(_amount)) {
                    throw new BadRequestException('Insufficient balance');
                }

                const rate = await this.fxService.getRate(from, to);

                if (!rate) {
                    throw new BadRequestException('Exchange rate not available');
                }

                const _rate = new Decimal(rate)
                const convertedAmount = _amount.times(_rate);

                const userWalletTo = await this.findOneOrCreate({ user, currency: to });
                const _balanceTo = new Decimal(userWalletTo?.balance || 0)


                await this.walletRepo.manager.transaction(async (manager) => {

                    userWalletFrom.balance = _balanceFrom.minus(_amount).toNumber();
                    userWalletTo.balance = _balanceTo.plus(convertedAmount).toNumber();

                    // Save the updated wallet balances
                    await manager.save([userWalletFrom, userWalletTo]);

                    // Create and save the transaction record
                    const tx = this.transactionRepo.create({
                        user: { id: user.id },
                        fromCurrency: from,
                        toCurrency: to,
                        amount,
                        rate,
                        type: TransactionType.CONVERSION,
                        createdAt: new Date(),
                    });
                    await manager.save(tx);
                });

                return { message: "Converted successfully" };
            } catch (error) {
                if (error instanceof BadRequestException) throw error;
                this.logger.error(error);
                throw new InternalServerErrorException('Currency conversion failed');
            } finally {
                await this.redisService.releaseLock(`user:${user.id}`, lockId);
            }
        }
        else {
            throw new BadRequestException('System Busy')
        }
    }



    async tradeCurrency(user: User, dto: TradeCurrencyDto) {
        const lockId = await this.redisService.acquireLock(`user:${user.id}`);

        if (lockId) {

            try {
                if (dto.from === dto.to) {
                    throw new BadRequestException("You can't trade the same currency");
                }

                const { amount, from, to } = dto
                const _amount = new Decimal(amount)
                const userWalletFrom = await this.walletRepo.findOne({ where: { user: { id: user.id }, currency: from } });

                const _balanceFrom = new Decimal(userWalletFrom?.balance || 0)

                if (!userWalletFrom || _balanceFrom.lessThan(_amount)) {
                    throw new BadRequestException('Insufficient balance');
                }

                const rate = await this.fxService.getRate(from, to);
                if (!rate) {
                    throw new BadRequestException('Exchange rate not available');
                }

                const _rate = new Decimal(rate)
                const convertedAmount = _amount.times(_rate);

                const userWalletTo = await this.findOneOrCreate({ user, currency: to });
                const _balanceTo = new Decimal(userWalletTo?.balance || 0)


                await this.walletRepo.manager.transaction(async (manager) => {

                    userWalletFrom.balance = _balanceFrom.minus(_amount).toNumber();
                    userWalletTo.balance = _balanceTo.plus(convertedAmount).toNumber();

                    // Save the updated wallet balances
                    await manager.save([userWalletFrom, userWalletTo]);

                    // Create and save the transaction record
                    const tx = this.transactionRepo.create({
                        user: { id: user.id },
                        fromCurrency: from,
                        toCurrency: to,
                        amount,
                        rate,
                        type: TransactionType.TRADE,
                        createdAt: new Date(),
                    });
                    await manager.save(tx);
                });

                return { message: "Traded successfully" };
            } catch (error) {
                if (error instanceof BadRequestException) throw error;
                this.logger.error(error);
                throw new InternalServerErrorException();
            }
            finally {
                await this.redisService.releaseLock(`user:${user.id}`, lockId);
            }
        }
        else {
            throw new BadRequestException('System Busy')
        }
    }

    async fundWallet(user: User, fundWalletDto: FundWalletDto): Promise<Wallet> {
        const lockId = await this.redisService.acquireLock(`user:${user.id}`);

        if (lockId) {

            try {
                const { amount, currency } = fundWalletDto;

                const wallet = await this.findOneOrCreate({ user, currency });
                if (!wallet) {
                    throw new BadRequestException('Wallet funding was not successful');
                }

                const currentBalance = new Decimal(wallet.balance);
                const amountToAdd = new Decimal(amount);

                await this.walletRepo.manager.transaction(async (manager) => {

                    wallet.balance = currentBalance.plus(amountToAdd).toNumber();

                    // Save the updated wallet balances
                    await manager.save([wallet]);

                    // Create and save the transaction record
                    const tx = this.transactionRepo.create({
                        user: { id: user.id },
                        fromCurrency: currency,
                        toCurrency: currency,
                        amount,
                        rate: 1,
                        type: TransactionType.FUNDING,
                        createdAt: new Date(),
                    });
                    await manager.save(tx);
                });

                return wallet
            } catch (error) {
                if (error instanceof BadRequestException) throw error;
                this.logger.error(error);
                throw new InternalServerErrorException();
            }
            finally {
                await this.redisService.releaseLock(`user:${user.id}`, lockId);
            }
        }
        else {
            throw new BadRequestException('System Busy')
        }
    }

    async getTransactions(user: User, page: number, limit: number) {
        try {
            const skip = (page - 1) * limit;

            const queryBuilder = this.transactionRepo.createQueryBuilder('transaction')
                .leftJoinAndSelect('transaction.user', 'user')
                .orderBy('transaction.createdAt', 'DESC')
                .skip(skip)
                .take(limit);

            if (user.role !== UserRole.ADMIN) {
                queryBuilder.where('transaction.userId = :userId', { userId: user.id });
            }

            const [transactions, total] = await queryBuilder.getManyAndCount();
            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            return {
                data: transactions,
                total,
                page,
                limit,
                totalPages,
                hasNextPage,
                hasPrevPage
            };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }
}
