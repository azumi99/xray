import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDetailRescan1793559000000 implements MigrationInterface {
    name = 'AddDetailRescan1793559000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `airwaybill_xray_details` ADD COLUMN `rescan` int NULL AFTER `xray_photo`');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `airwaybill_xray_details` DROP COLUMN `rescan`');
    }
}
