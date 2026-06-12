import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTable1781294618144 implements MigrationInterface {
  name = 'CreateNotificationTable1781294618144';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unnamed" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e9d1bf2de5917ce02b58842c16b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "content" text NOT NULL, "type" character varying(100) NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "relatedEntityId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`,
    );
    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(`DROP TABLE "unnamed"`);
  }
}
