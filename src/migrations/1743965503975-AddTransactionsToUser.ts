import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class AddTransactionsToUser1743965503975 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the 'transactions' table
        await queryRunner.query(`
          CREATE TABLE "transactions" (
            "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "userId" UUID NOT NULL,
            "type" VARCHAR CHECK ("type" IN ('funding', 'conversion', 'trade')) DEFAULT 'funding',
            "amount" DECIMAL(18,2) NOT NULL,
            "fromCurrency" currency_enum NOT NULL,
            "toCurrency" currency_enum NOT NULL,
            "rate" DECIMAL(10,4) NOT NULL,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
    
        // Add foreign key to the 'userId' column to link transactions to users
        await queryRunner.query(`
          ALTER TABLE "transactions"
          ADD CONSTRAINT "FK_transactions_user"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
        `);
      }
    
      public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the foreign key and the table in case of rollback
        const table = await queryRunner.getTable('transactions');
        const foreignKey = table!.foreignKeys.find(
          (fk) => fk.columnNames.indexOf('userId') !== -1
        );
        await queryRunner.dropForeignKey('transactions', foreignKey!);
        await queryRunner.dropTable('transactions');
      }
}
