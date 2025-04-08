import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


export enum CurrencyEnum {
    NGN = 'NGN',
    USD = 'USD',
    EUR = 'EUR',
    GBP = 'GBP',
}


@Entity('wallets')
export class Wallet {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.wallets)
    user: User;

    @Column()
    currency: 'NGN' | 'USD' | 'EUR' | 'GBP';

    @Column('decimal', { precision: 18, scale: 2, default: 0 })
    balance: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
