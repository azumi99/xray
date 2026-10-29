import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAwbStatus1791528533309 implements MigrationInterface {
    name = 'AddAwbStatus1791528533309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`status\` varchar(20) NOT NULL DEFAULT 'waiting'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`status\``);
    }

}
