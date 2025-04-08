import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum TransactionType {
    FUNDING = 'funding',
    CONVERSION = 'conversion',
    TRADE = 'trade',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.transactions)
    user: User;

    @Column()
    type: TransactionType;

    @Column('decimal', { precision: 18, scale: 2 })
    amount: number;

    @Column()
    fromCurrency: string;

    @Column()
    toCurrency: string;

    @Column('decimal', { precision: 10, scale: 4 })
    rate: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
