import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase4CheckIn1780610000000 implements MigrationInterface {
  name = 'CreatePhase4CheckIn1780610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_staff_assignment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "staffId" character varying NOT NULL,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_event_staff" UNIQUE ("eventId", "staffId"),
        CONSTRAINT "PK_event_staff_assignment" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_esa_eventId" ON "event_staff_assignment" ("eventId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_esa_staffId" ON "event_staff_assignment" ("staffId")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."check_in_log_method_enum" AS ENUM('qr', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TABLE "check_in_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticketId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        "staffId" character varying NOT NULL,
        "scannedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "method" "public"."check_in_log_method_enum" NOT NULL,
        CONSTRAINT "PK_check_in_log" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cil_ticketId" ON "check_in_log" ("ticketId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cil_eventId" ON "check_in_log" ("eventId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cil_staffId" ON "check_in_log" ("staffId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_cil_staffId"`);
    await queryRunner.query(`DROP INDEX "IDX_cil_eventId"`);
    await queryRunner.query(`DROP INDEX "IDX_cil_ticketId"`);
    await queryRunner.query(`DROP TABLE "check_in_log"`);
    await queryRunner.query(`DROP TYPE "public"."check_in_log_method_enum"`);
    await queryRunner.query(`DROP INDEX "IDX_esa_staffId"`);
    await queryRunner.query(`DROP INDEX "IDX_esa_eventId"`);
    await queryRunner.query(`DROP TABLE "event_staff_assignment"`);
  }
}
