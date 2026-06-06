import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase5Waitlist1780700000000 implements MigrationInterface {
  name = 'CreatePhase5Waitlist1780700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."waitlist_entry_status_enum" AS ENUM('waiting', 'notified', 'fulfilled', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "waitlist_entry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "ticketTypeId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        "status" "public"."waitlist_entry_status_enum" NOT NULL DEFAULT 'waiting',
        "notifiedAt" TIMESTAMP WITH TIME ZONE,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_waitlist_entry" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_userId" ON "waitlist_entry" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_ticketTypeId" ON "waitlist_entry" ("ticketTypeId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_eventId" ON "waitlist_entry" ("eventId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_status" ON "waitlist_entry" ("status")`,
    );
    // One active entry per user per ticket type (waiting or notified).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_we_user_tickettype_active"
        ON "waitlist_entry" ("userId", "ticketTypeId")
        WHERE status IN ('waiting', 'notified')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_we_user_tickettype_active"`);
    await queryRunner.query(`DROP INDEX "IDX_we_status"`);
    await queryRunner.query(`DROP INDEX "IDX_we_eventId"`);
    await queryRunner.query(`DROP INDEX "IDX_we_ticketTypeId"`);
    await queryRunner.query(`DROP INDEX "IDX_we_userId"`);
    await queryRunner.query(`DROP TABLE "waitlist_entry"`);
    await queryRunner.query(`DROP TYPE "public"."waitlist_entry_status_enum"`);
  }
}
