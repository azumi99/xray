import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLabelFedexPart1793563000000 implements MigrationInterface {
    name = 'AddLabelFedexPart1793563000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `label_fedex` ADD COLUMN `part` int NULL AFTER `pcs_hawb`');
        await queryRunner.query('CREATE UNIQUE INDEX `IDX_label_fedex_mawb_hawb_part` ON `label_fedex` (`mawb`, `hawb`, `part`)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX `IDX_label_fedex_mawb_hawb_part` ON `label_fedex`');
        await queryRunner.query('ALTER TABLE `label_fedex` DROP COLUMN `part`');
    }
}
