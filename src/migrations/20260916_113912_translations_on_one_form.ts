import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Translated content moves from Payload locale tables (`*_locales`, one row per language)
 * to explicit per-language columns (`name_ckb`, `name_ar`, `name_en`, ...) so the owner
 * edits every language on one form (docs/decisions.md). Existing translations are copied,
 * including the product version history the admin edits from.
 *
 * Backward compatible on purpose: the previous build (still live while this runs, see
 * docs/deployment.md "Release procedure") keeps reading the old locale tables and the
 * `snapshot` / `published_locale` version columns, so nothing is dropped here except the
 * already-unused `media_locales`. Pending cleanup for a later migration, once this build
 * is live: DROP the `products_locales`, `_products_v_locales`, `categories_locales`,
 * `cities_locales` and `shop_settings_locales` tables, the `_products_v.snapshot` and
 * `_products_v.published_locale` columns (and their indexes), and the `_locales` and
 * `enum__products_v_published_locale` types.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "name_ckb" varchar;
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "name_ar" varchar;
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "name_en" varchar;
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "description_ckb" varchar;
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "description_ar" varchar;
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "description_en" varchar;
   ALTER TABLE "starlight"."products" ADD COLUMN IF NOT EXISTS "admin_title" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_name_ckb" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_name_ar" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_name_en" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_description_ckb" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_description_ar" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_description_en" varchar;
   ALTER TABLE "starlight"."_products_v" ADD COLUMN IF NOT EXISTS "version_admin_title" varchar;
   ALTER TABLE "starlight"."categories" ADD COLUMN IF NOT EXISTS "name_ckb" varchar;
   ALTER TABLE "starlight"."categories" ADD COLUMN IF NOT EXISTS "name_ar" varchar;
   ALTER TABLE "starlight"."categories" ADD COLUMN IF NOT EXISTS "name_en" varchar;
   ALTER TABLE "starlight"."categories" ADD COLUMN IF NOT EXISTS "admin_title" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "name_ckb" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "name_ar" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "name_en" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "admin_title" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "normalized_name_ckb" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "normalized_name_ar" varchar;
   ALTER TABLE "starlight"."cities" ADD COLUMN IF NOT EXISTS "normalized_name_en" varchar;
   ALTER TABLE "starlight"."shop_settings" ADD COLUMN IF NOT EXISTS "about_text_ckb" varchar;
   ALTER TABLE "starlight"."shop_settings" ADD COLUMN IF NOT EXISTS "about_text_ar" varchar;
   ALTER TABLE "starlight"."shop_settings" ADD COLUMN IF NOT EXISTS "about_text_en" varchar;

   -- Copy the stored translations (current documents).
   UPDATE "starlight"."products" AS p SET
     "name_ckb" = (SELECT l."name" FROM "starlight"."products_locales" AS l WHERE l."_parent_id" = p."id" AND l."_locale" = 'ckb'),
     "name_ar" = (SELECT l."name" FROM "starlight"."products_locales" AS l WHERE l."_parent_id" = p."id" AND l."_locale" = 'ar'),
     "name_en" = (SELECT l."name" FROM "starlight"."products_locales" AS l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en'),
     "description_ckb" = (SELECT l."description" FROM "starlight"."products_locales" AS l WHERE l."_parent_id" = p."id" AND l."_locale" = 'ckb'),
     "description_ar" = (SELECT l."description" FROM "starlight"."products_locales" AS l WHERE l."_parent_id" = p."id" AND l."_locale" = 'ar'),
     "description_en" = (SELECT l."description" FROM "starlight"."products_locales" AS l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en')
   WHERE p."name_ckb" IS NULL AND p."name_ar" IS NULL AND p."name_en" IS NULL;
   UPDATE "starlight"."products" SET "admin_title" = COALESCE(
     NULLIF(concat_ws(' · ', NULLIF(btrim("name_en"), ''), NULLIF(btrim("name_ckb"), '')), ''),
     NULLIF(btrim("name_ar"), ''), "slug", 'Untitled product')
   WHERE "admin_title" IS NULL;

   -- Copy the product version history (the admin edits the latest version).
   UPDATE "starlight"."_products_v" AS v SET
     "version_name_ckb" = (SELECT l."version_name" FROM "starlight"."_products_v_locales" AS l WHERE l."_parent_id" = v."id" AND l."_locale" = 'ckb'),
     "version_name_ar" = (SELECT l."version_name" FROM "starlight"."_products_v_locales" AS l WHERE l."_parent_id" = v."id" AND l."_locale" = 'ar'),
     "version_name_en" = (SELECT l."version_name" FROM "starlight"."_products_v_locales" AS l WHERE l."_parent_id" = v."id" AND l."_locale" = 'en'),
     "version_description_ckb" = (SELECT l."version_description" FROM "starlight"."_products_v_locales" AS l WHERE l."_parent_id" = v."id" AND l."_locale" = 'ckb'),
     "version_description_ar" = (SELECT l."version_description" FROM "starlight"."_products_v_locales" AS l WHERE l."_parent_id" = v."id" AND l."_locale" = 'ar'),
     "version_description_en" = (SELECT l."version_description" FROM "starlight"."_products_v_locales" AS l WHERE l."_parent_id" = v."id" AND l."_locale" = 'en')
   WHERE v."version_name_ckb" IS NULL AND v."version_name_ar" IS NULL AND v."version_name_en" IS NULL;
   UPDATE "starlight"."_products_v" SET "version_admin_title" = COALESCE(
     NULLIF(concat_ws(' · ', NULLIF(btrim("version_name_en"), ''), NULLIF(btrim("version_name_ckb"), '')), ''),
     NULLIF(btrim("version_name_ar"), ''), "version_slug", 'Untitled product')
   WHERE "version_admin_title" IS NULL;

   UPDATE "starlight"."categories" AS c SET
     "name_ckb" = (SELECT l."name" FROM "starlight"."categories_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'ckb'),
     "name_ar" = (SELECT l."name" FROM "starlight"."categories_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'ar'),
     "name_en" = (SELECT l."name" FROM "starlight"."categories_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'en')
   WHERE c."name_ckb" IS NULL AND c."name_ar" IS NULL AND c."name_en" IS NULL;
   UPDATE "starlight"."categories" SET "admin_title" = COALESCE(
     NULLIF(concat_ws(' · ', NULLIF(btrim("name_en"), ''), NULLIF(btrim("name_ckb"), '')), ''),
     NULLIF(btrim("name_ar"), ''), "slug", 'Untitled category')
   WHERE "admin_title" IS NULL;

   UPDATE "starlight"."cities" AS c SET
     "name_ckb" = (SELECT l."name" FROM "starlight"."cities_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'ckb'),
     "name_ar" = (SELECT l."name" FROM "starlight"."cities_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'ar'),
     "name_en" = (SELECT l."name" FROM "starlight"."cities_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'en'),
     "normalized_name_ckb" = (SELECT l."normalized_name" FROM "starlight"."cities_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'ckb'),
     "normalized_name_ar" = (SELECT l."normalized_name" FROM "starlight"."cities_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'ar'),
     "normalized_name_en" = (SELECT l."normalized_name" FROM "starlight"."cities_locales" AS l WHERE l."_parent_id" = c."id" AND l."_locale" = 'en')
   WHERE c."name_ckb" IS NULL AND c."name_ar" IS NULL AND c."name_en" IS NULL;
   UPDATE "starlight"."cities" SET "admin_title" = COALESCE(
     NULLIF(concat_ws(' · ', NULLIF(btrim("name_en"), ''), NULLIF(btrim("name_ckb"), '')), ''),
     NULLIF(btrim("name_ar"), ''), 'Untitled city')
   WHERE "admin_title" IS NULL;

   UPDATE "starlight"."shop_settings" AS s SET
     "about_text_ckb" = (SELECT l."about_text" FROM "starlight"."shop_settings_locales" AS l WHERE l."_parent_id" = s."id" AND l."_locale" = 'ckb'),
     "about_text_ar" = (SELECT l."about_text" FROM "starlight"."shop_settings_locales" AS l WHERE l."_parent_id" = s."id" AND l."_locale" = 'ar'),
     "about_text_en" = (SELECT l."about_text" FROM "starlight"."shop_settings_locales" AS l WHERE l."_parent_id" = s."id" AND l."_locale" = 'en')
   WHERE s."about_text_ckb" IS NULL AND s."about_text_ar" IS NULL AND s."about_text_en" IS NULL;

   CREATE INDEX IF NOT EXISTS "products_admin_title_idx" ON "starlight"."products" USING btree ("admin_title");
   CREATE INDEX IF NOT EXISTS "_products_v_version_version_admin_title_idx" ON "starlight"."_products_v" USING btree ("version_admin_title");
   CREATE INDEX IF NOT EXISTS "categories_admin_title_idx" ON "starlight"."categories" USING btree ("admin_title");
   CREATE INDEX IF NOT EXISTS "cities_admin_title_idx" ON "starlight"."cities" USING btree ("admin_title");
   CREATE INDEX IF NOT EXISTS "cities_normalized_name_normalized_name_ckb_idx" ON "starlight"."cities" USING btree ("normalized_name_ckb");
   CREATE INDEX IF NOT EXISTS "cities_normalized_name_normalized_name_ar_idx" ON "starlight"."cities" USING btree ("normalized_name_ar");
   CREATE INDEX IF NOT EXISTS "cities_normalized_name_normalized_name_en_idx" ON "starlight"."cities" USING btree ("normalized_name_en");
   CREATE UNIQUE INDEX IF NOT EXISTS "cities_normalized_name_ckb_unique" ON "starlight"."cities" USING btree ("normalized_name_ckb");
   CREATE UNIQUE INDEX IF NOT EXISTS "cities_normalized_name_ar_unique" ON "starlight"."cities" USING btree ("normalized_name_ar");
   CREATE UNIQUE INDEX IF NOT EXISTS "cities_normalized_name_en_unique" ON "starlight"."cities" USING btree ("normalized_name_en");

   -- Unused since the previous migration (image descriptions are shared).
   DROP TABLE IF EXISTS "starlight"."media_locales" CASCADE;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "starlight"."products_admin_title_idx";
   DROP INDEX IF EXISTS "starlight"."_products_v_version_version_admin_title_idx";
   DROP INDEX IF EXISTS "starlight"."categories_admin_title_idx";
   DROP INDEX IF EXISTS "starlight"."cities_admin_title_idx";
   DROP INDEX IF EXISTS "starlight"."cities_normalized_name_normalized_name_ckb_idx";
   DROP INDEX IF EXISTS "starlight"."cities_normalized_name_normalized_name_ar_idx";
   DROP INDEX IF EXISTS "starlight"."cities_normalized_name_normalized_name_en_idx";
   DROP INDEX IF EXISTS "starlight"."cities_normalized_name_ckb_unique";
   DROP INDEX IF EXISTS "starlight"."cities_normalized_name_ar_unique";
   DROP INDEX IF EXISTS "starlight"."cities_normalized_name_en_unique";
   ALTER TABLE "starlight"."products" DROP COLUMN IF EXISTS "name_ckb", DROP COLUMN IF EXISTS "name_ar", DROP COLUMN IF EXISTS "name_en",
     DROP COLUMN IF EXISTS "description_ckb", DROP COLUMN IF EXISTS "description_ar", DROP COLUMN IF EXISTS "description_en",
     DROP COLUMN IF EXISTS "admin_title";
   ALTER TABLE "starlight"."_products_v" DROP COLUMN IF EXISTS "version_name_ckb", DROP COLUMN IF EXISTS "version_name_ar", DROP COLUMN IF EXISTS "version_name_en",
     DROP COLUMN IF EXISTS "version_description_ckb", DROP COLUMN IF EXISTS "version_description_ar", DROP COLUMN IF EXISTS "version_description_en",
     DROP COLUMN IF EXISTS "version_admin_title";
   ALTER TABLE "starlight"."categories" DROP COLUMN IF EXISTS "name_ckb", DROP COLUMN IF EXISTS "name_ar", DROP COLUMN IF EXISTS "name_en", DROP COLUMN IF EXISTS "admin_title";
   ALTER TABLE "starlight"."cities" DROP COLUMN IF EXISTS "name_ckb", DROP COLUMN IF EXISTS "name_ar", DROP COLUMN IF EXISTS "name_en", DROP COLUMN IF EXISTS "admin_title",
     DROP COLUMN IF EXISTS "normalized_name_ckb", DROP COLUMN IF EXISTS "normalized_name_ar", DROP COLUMN IF EXISTS "normalized_name_en";
   ALTER TABLE "starlight"."shop_settings" DROP COLUMN IF EXISTS "about_text_ckb", DROP COLUMN IF EXISTS "about_text_ar", DROP COLUMN IF EXISTS "about_text_en";`)
}
