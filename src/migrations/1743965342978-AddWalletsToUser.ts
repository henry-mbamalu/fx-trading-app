import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddWalletsToUser1743965342978 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "currency_enum" AS ENUM ('NGN', 'USD', 'EUR', 'GBP')
    `);
    // Create the 'wallets' table
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "currency" currency_enum NOT NULL DEFAULT 'NGN',
        "balance" DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add foreign key to the 'userId' column to link the wallets to users
    await queryRunner.query(`
      ALTER TABLE "wallets"
      ADD CONSTRAINT "FK_wallets_user"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the foreign key and the table in case of rollback
    const table = await queryRunner.getTable('wallets');
    const foreignKey = table!.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1
    );
    await queryRunner.dropForeignKey('wallets', foreignKey!);
    await queryRunner.dropTable('wallets');
  }
}