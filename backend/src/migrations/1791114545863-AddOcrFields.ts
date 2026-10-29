import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOcrFields1791114545863 implements MigrationInterface {
    name = 'AddOcrFields1791114545863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`kurir\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`tanggal\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`pengirim\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`penerima_nama\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`penerima_alamat\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`penerima_kota\` varchar(150) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`penerima_kode_pos\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`penerima_telepon\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`berat\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`jumlah_koli\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`isi_barang\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`nilai_deklarasi\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`tipe_pajak\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` ADD \`cod\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`cod\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`tipe_pajak\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`nilai_deklarasi\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`isi_barang\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`jumlah_koli\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`berat\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`penerima_telepon\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`penerima_kode_pos\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`penerima_kota\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`penerima_alamat\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`penerima_nama\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`pengirim\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`tanggal\``);
        await queryRunner.query(`ALTER TABLE \`airwaybill_xrays\` DROP COLUMN \`kurir\``);
    }

}
