import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase3BookingPayment1780542357797 implements MigrationInterface {
  name = 'CreatePhase3BookingPayment1780542357797';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status_enum" AS ENUM('pending_payment', 'paid', 'expired', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" character varying NOT NULL, "status" "public"."booking_status_enum" NOT NULL DEFAULT 'pending_payment', "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "promoCodeId" uuid, "subtotalAmount" integer NOT NULL, "discountAmount" integer NOT NULL DEFAULT '0', "totalAmount" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_49171efc69702ed84c812f33540" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_72e32d29a7de28b3c469f858d5" ON "booking" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_83dda68f1025a4b14250ca017c" ON "booking" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5db56ab1a9056cd94a10109b56" ON "booking" ("expiresAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" uuid NOT NULL, "ticketTypeId" uuid NOT NULL, "quantity" integer NOT NULL, "unitPrice" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f00cae6b1d793669a01d03df5d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9faafa553fc2800ecd63392aed" ON "booking_item" ("bookingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_27b054260a95c49dbf53106e9b" ON "booking_item" ("ticketTypeId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ticket_status_enum" AS ENUM('issued', 'used', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ticket" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingItemId" uuid NOT NULL, "eventId" uuid NOT NULL, "customerId" character varying NOT NULL, "code" character varying NOT NULL, "qrSecret" character varying NOT NULL, "status" "public"."ticket_status_enum" NOT NULL DEFAULT 'issued', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78fb6cf594dc323ec3e00c4c85" ON "ticket" ("bookingItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb22a51617991265571be41b74" ON "ticket" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8932781487db15d1393b206482" ON "ticket" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2ebff7c458ed09689a53242fec" ON "ticket" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89b0129dcb346cd9be42a6bbbf" ON "ticket" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."promo_code_discounttype_enum" AS ENUM('percent', 'fixed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "promo_code" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "discountType" "public"."promo_code_discounttype_enum" NOT NULL, "discountValue" integer NOT NULL, "maxUses" integer NOT NULL, "usedCount" integer NOT NULL DEFAULT '0', "validFrom" TIMESTAMP WITH TIME ZONE NOT NULL, "validTo" TIMESTAMP WITH TIME ZONE NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ded0af550884c7ab3e345e76d73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a456233366901b110f09fe478e" ON "promo_code" ("code") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookingId" uuid NOT NULL, "stripePaymentIntentId" character varying NOT NULL, "amount" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'vnd', "status" "public"."payment_status_enum" NOT NULL DEFAULT 'pending', "stripeRefundId" character varying, "refundedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5738278c92c15e1ec9d27e3a09" ON "payment" ("bookingId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_aaf4912b634282efbc202ebd4d" ON "payment" ("stripePaymentIntentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3af0086da18f32ac05a52e5639" ON "payment" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "action" character varying NOT NULL, "entity" character varying NOT NULL, "entityId" character varying NOT NULL, "payload" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2621409ebc295c5da7ff3e4139" ON "audit_log" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_951e6339a77994dfbad976b35c" ON "audit_log" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a09a92c169c7e52e7920f07c8" ON "audit_log" ("entityId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_item" ADD CONSTRAINT "FK_9faafa553fc2800ecd63392aedc" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_item" ADD CONSTRAINT "FK_27b054260a95c49dbf53106e9b7" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket" ADD CONSTRAINT "FK_78fb6cf594dc323ec3e00c4c85a" FOREIGN KEY ("bookingItemId") REFERENCES "booking_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ticket" DROP CONSTRAINT "FK_78fb6cf594dc323ec3e00c4c85a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_item" DROP CONSTRAINT "FK_27b054260a95c49dbf53106e9b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_item" DROP CONSTRAINT "FK_9faafa553fc2800ecd63392aedc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a09a92c169c7e52e7920f07c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_951e6339a77994dfbad976b35c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2621409ebc295c5da7ff3e4139"`,
    );
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3af0086da18f32ac05a52e5639"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aaf4912b634282efbc202ebd4d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5738278c92c15e1ec9d27e3a09"`,
    );
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a456233366901b110f09fe478e"`,
    );
    await queryRunner.query(`DROP TABLE "promo_code"`);
    await queryRunner.query(
      `DROP TYPE "public"."promo_code_discounttype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_89b0129dcb346cd9be42a6bbbf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ebff7c458ed09689a53242fec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8932781487db15d1393b206482"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb22a51617991265571be41b74"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78fb6cf594dc323ec3e00c4c85"`,
    );
    await queryRunner.query(`DROP TABLE "ticket"`);
    await queryRunner.query(`DROP TYPE "public"."ticket_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_27b054260a95c49dbf53106e9b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9faafa553fc2800ecd63392aed"`,
    );
    await queryRunner.query(`DROP TABLE "booking_item"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5db56ab1a9056cd94a10109b56"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_83dda68f1025a4b14250ca017c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_72e32d29a7de28b3c469f858d5"`,
    );
    await queryRunner.query(`DROP TABLE "booking"`);
    await queryRunner.query(`DROP TYPE "public"."booking_status_enum"`);
  }
}
