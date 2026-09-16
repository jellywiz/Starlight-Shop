import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Web addresses (slugs) are generated and hidden from the admin (docs/decisions.md). A
 * category's address is frozen at its first activation, recorded in `activated_at`;
 * categories that are active today are treated as already frozen. The category slug is no
 * longer NOT NULL: an inactive category saved without an English name has no address yet.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "starlight"."categories" ALTER COLUMN "slug" DROP NOT NULL;
   ALTER TABLE "starlight"."categories" ADD COLUMN IF NOT EXISTS "activated_at" timestamp(3) with time zone;
   UPDATE "starlight"."categories" SET "activated_at" = COALESCE("updated_at", now())
   WHERE "is_active" = true AND "activated_at" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "starlight"."categories" DROP COLUMN IF EXISTS "activated_at";
   UPDATE "starlight"."categories" SET "slug" = 'category-' || "id" WHERE "slug" IS NULL;
   ALTER TABLE "starlight"."categories" ALTER COLUMN "slug" SET NOT NULL;`)
}
