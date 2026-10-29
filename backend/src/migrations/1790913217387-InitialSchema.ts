import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790913217387 implements MigrationInterface {
    name = 'InitialSchema1790913217387'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`airwaybill_xray_details\` (\`id\` int NOT NULL AUTO_INCREMENT, \`xray_photo\` varchar(500) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`id_airwaybill\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`airwaybill_xrays\` (\`id\` int NOT NULL AUTO_INCREMENT, \`airwaybill_number\` varchar(500) NOT NULL, \`photo_airwaybill\` varchar(500) NULL, \`hawb\` varchar(500) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_385315fb3ab6375cb15b8104ac\` (\`airwaybill_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`watched_files\` (\`id\` int NOT NULL AUTO_INCREMENT, \`filepath\` varchar(500) NOT NULL, \`assign_id\` varchar(100) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xray_details\` ADD CONSTRAINT \`FK_2ec03f5057f889f829d366f3926\` FOREIGN KEY (\`id_airwaybill\`) REFERENCES \`airwaybill_xrays\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`airwaybill_xray_details\` DROP FOREIGN KEY \`FK_2ec03f5057f889f829d366f3926\``);
        await queryRunner.query(`DROP TABLE \`watched_files\``);
        await queryRunner.query(`DROP INDEX \`IDX_385315fb3ab6375cb15b8104ac\` ON \`airwaybill_xrays\``);
        await queryRunner.query(`DROP TABLE \`airwaybill_xrays\``);
        await queryRunner.query(`DROP TABLE \`airwaybill_xray_details\``);
    }

}
