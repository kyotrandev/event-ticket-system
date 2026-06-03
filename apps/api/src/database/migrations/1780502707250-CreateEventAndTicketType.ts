import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventAndTicketType1780502707250 implements MigrationInterface {
  name = 'CreateEventAndTicketType1780502707250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."event_status_enum" AS ENUM('draft', 'published', 'ongoing', 'ended', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizerId" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "location" character varying NOT NULL, "category" character varying NOT NULL, "tags" text array, "startTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endTime" TIMESTAMP WITH TIME ZONE NOT NULL, "bannerUrl" character varying, "cancellationWindowHours" integer NOT NULL DEFAULT '24', "maxTicketsPerOrder" integer NOT NULL DEFAULT '6', "status" "public"."event_status_enum" NOT NULL DEFAULT 'draft', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19642e6a244b4885e14eab0fdc" ON "event" ("organizerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa3134b6329dc3399e699ffaca" ON "event" ("startTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4e8fcaf6d49972cd8df9017fb" ON "event" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ticket_type_status_enum" AS ENUM('available', 'sold_out', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ticket_type" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" uuid NOT NULL, "name" character varying NOT NULL, "price" integer NOT NULL, "totalQty" integer NOT NULL, "soldQty" integer NOT NULL DEFAULT '0', "reservedQty" integer NOT NULL DEFAULT '0', "saleStart" TIMESTAMP WITH TIME ZONE NOT NULL, "saleEnd" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."ticket_type_status_enum" NOT NULL DEFAULT 'available', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_757d4830df239a662399edf9f24" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9565dc40fcd98961539814b50" ON "ticket_type" ("eventId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_type" ADD CONSTRAINT "FK_f9565dc40fcd98961539814b50b" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ticket_type" DROP CONSTRAINT "FK_f9565dc40fcd98961539814b50b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9565dc40fcd98961539814b50"`,
    );
    await queryRunner.query(`DROP TABLE "ticket_type"`);
    await queryRunner.query(`DROP TYPE "public"."ticket_type_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d4e8fcaf6d49972cd8df9017fb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa3134b6329dc3399e699ffaca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19642e6a244b4885e14eab0fdc"`,
    );
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`DROP TYPE "public"."event_status_enum"`);
  }
}
