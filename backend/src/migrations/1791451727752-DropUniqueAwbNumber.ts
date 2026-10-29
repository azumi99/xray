import { MigrationInterface, QueryRunner } from "typeorm";

export class DropUniqueAwbNumber1791451727752 implements MigrationInterface {
    name = 'DropUniqueAwbNumber1791451727752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_385315fb3ab6375cb15b8104ac\` ON \`airwaybill_xrays\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_385315fb3ab6375cb15b8104ac\` ON \`airwaybill_xrays\` (\`airwaybill_number\`)`);
    }

}
