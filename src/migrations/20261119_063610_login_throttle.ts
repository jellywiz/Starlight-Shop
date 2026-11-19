import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "starlight"."login_throttle" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"attempts" numeric NOT NULL,
  	"window_start" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE UNIQUE INDEX "login_throttle_key_idx" ON "starlight"."login_throttle" USING btree ("key");
  CREATE INDEX "login_throttle_window_start_idx" ON "starlight"."login_throttle" USING btree ("window_start");
  CREATE INDEX "login_throttle_updated_at_idx" ON "starlight"."login_throttle" USING btree ("updated_at");
  CREATE INDEX "login_throttle_created_at_idx" ON "starlight"."login_throttle" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "starlight"."login_throttle" CASCADE;`)
}
