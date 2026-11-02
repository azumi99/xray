import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLabelFedex1793467000000 implements MigrationInterface {
    name = 'AddLabelFedex1793467000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `CREATE TABLE IF NOT EXISTS \`label_fedex\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`mawb\` varchar(32) NOT NULL,
            \`pcs_mawb\` int NULL,
            \`hawb\` varchar(32) NOT NULL,
            \`pcs_hawb\` int NULL,
            \`airlines_name\` varchar(64) NULL,
            \`flight_no\` varchar(16) NULL,
            \`route\` varchar(32) NULL,
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`label_fedex\``);
    }
}
