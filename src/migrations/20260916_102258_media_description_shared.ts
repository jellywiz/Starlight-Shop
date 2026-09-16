import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The image description (alt text) becomes one optional field shared by all languages
 * (owner decision, docs/decisions.md). Existing per-language descriptions are kept by
 * taking the first non-empty one in the site's language order (ckb, ar, en).
 *
 * "media_locales" is deliberately NOT dropped here: the release procedure runs migrations
 * before the new code is deployed, and the currently deployed code still reads that table.
 * It is unused once this code is live and can be dropped by a later migration.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "starlight"."media" ADD COLUMN IF NOT EXISTS "alt_text" varchar;
   UPDATE "starlight"."media" AS m SET "alt_text" = COALESCE(
     NULLIF(BTRIM((SELECT l."alt_text" FROM "starlight"."media_locales" AS l WHERE l."_parent_id" = m."id" AND l."_locale" = 'ckb')), ''),
     NULLIF(BTRIM((SELECT l."alt_text" FROM "starlight"."media_locales" AS l WHERE l."_parent_id" = m."id" AND l."_locale" = 'ar')), ''),
     NULLIF(BTRIM((SELECT l."alt_text" FROM "starlight"."media_locales" AS l WHERE l."_parent_id" = m."id" AND l."_locale" = 'en')), '')
   )
   WHERE m."alt_text" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "starlight"."media_locales" (
  	"alt_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
   );
   DO $$ BEGIN
     ALTER TABLE "starlight"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."media"("id") ON DELETE cascade ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   CREATE UNIQUE INDEX IF NOT EXISTS "media_locales_locale_parent_id_unique" ON "starlight"."media_locales" USING btree ("_locale","_parent_id");
   ALTER TABLE "starlight"."media" DROP COLUMN IF EXISTS "alt_text";`)
}
