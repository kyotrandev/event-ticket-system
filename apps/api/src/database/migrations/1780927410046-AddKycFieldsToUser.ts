import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKycFieldsToUser1780927410046 implements MigrationInterface {
  name = 'AddKycFieldsToUser1780927410046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_we_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_we_ticketTypeId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_we_eventId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_we_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_we_user_tickettype_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_esa_eventId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_esa_staffId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cil_ticketId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cil_eventId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cil_staffId"`);
    await queryRunner.query(
      `ALTER TABLE "event_staff_assignment" DROP CONSTRAINT "UQ_event_staff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "companyName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "phoneNumber" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."ticket_type_status_enum" RENAME TO "ticket_type_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ticket_type_status_enum" AS ENUM('available', 'upcoming', 'sold_out', 'closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ALTER COLUMN "status" TYPE "public"."ticket_type_status_enum" USING "status"::"text"::"public"."ticket_type_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ALTER COLUMN "status" SET DEFAULT 'available'`,
    );
    await queryRunner.query(`DROP TYPE "public"."ticket_type_status_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_4730cbbbc55be8d1796bc5727a" ON "waitlist_entry" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b161df24579ea586435f146cde" ON "waitlist_entry" ("ticketTypeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6703233257d700d202e8b62bf5" ON "waitlist_entry" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ecc78b633f05a2b046d9b4fdf" ON "waitlist_entry" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db96503e2611337634cd18a683" ON "event_staff_assignment" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fbb2259ee0f9d9d8deed31f02c" ON "event_staff_assignment" ("staffId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ae21d4010777e546b108171495" ON "check_in_log" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_11646384bbc05e55431cc9ad0c" ON "check_in_log" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7d05e4f37d86aa7a1ccbac89e" ON "check_in_log" ("staffId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "event_staff_assignment" ADD CONSTRAINT "UQ_8b584803fb3c88d11ca5940fa5d" UNIQUE ("eventId", "staffId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_staff_assignment" DROP CONSTRAINT "UQ_8b584803fb3c88d11ca5940fa5d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7d05e4f37d86aa7a1ccbac89e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_11646384bbc05e55431cc9ad0c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae21d4010777e546b108171495"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fbb2259ee0f9d9d8deed31f02c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db96503e2611337634cd18a683"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0ecc78b633f05a2b046d9b4fdf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6703233257d700d202e8b62bf5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b161df24579ea586435f146cde"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4730cbbbc55be8d1796bc5727a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ticket_type_status_enum_old" AS ENUM('available', 'sold_out', 'closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ALTER COLUMN "status" TYPE "public"."ticket_type_status_enum_old" USING "status"::"text"::"public"."ticket_type_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ALTER COLUMN "status" SET DEFAULT 'available'`,
    );
    await queryRunner.query(`DROP TYPE "public"."ticket_type_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."ticket_type_status_enum_old" RENAME TO "ticket_type_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phoneNumber"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "companyName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isEmailVerified"`);
    await queryRunner.query(
      `ALTER TABLE "event_staff_assignment" ADD CONSTRAINT "UQ_event_staff" UNIQUE ("eventId", "staffId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cil_staffId" ON "check_in_log" ("staffId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cil_eventId" ON "check_in_log" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cil_ticketId" ON "check_in_log" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_esa_staffId" ON "event_staff_assignment" ("staffId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_esa_eventId" ON "event_staff_assignment" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_we_user_tickettype_active" ON "waitlist_entry" ("userId", "ticketTypeId") WHERE (status = ANY (ARRAY['waiting'::waitlist_entry_status_enum, 'notified'::waitlist_entry_status_enum]))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_status" ON "waitlist_entry" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_eventId" ON "waitlist_entry" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_ticketTypeId" ON "waitlist_entry" ("ticketTypeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_we_userId" ON "waitlist_entry" ("userId") `,
    );
  }
}
