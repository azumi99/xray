import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAwbPart1793554000000 implements MigrationInterface {
    name = 'AddAwbPart1793554000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `airwaybill_xrays` ADD COLUMN `part` int NULL AFTER `jumlah_koli`');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `airwaybill_xrays` DROP COLUMN `part`');
    }
}
