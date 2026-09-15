import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // The dedicated application schema (spec section 6); Payload's generator assumes it exists.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "starlight";`)
  await db.execute(sql`
   CREATE TYPE "starlight"."_locales" AS ENUM('ckb', 'ar', 'en');
  CREATE TYPE "starlight"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "starlight"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "starlight"."enum__products_v_published_locale" AS ENUM('ckb', 'ar', 'en');
  CREATE TYPE "starlight"."enum_users_role" AS ENUM('owner');
  CREATE TYPE "starlight"."enum_shop_settings_default_locale" AS ENUM('ckb', 'ar', 'en');
  CREATE TABLE "starlight"."products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"price_iqd" numeric,
  	"is_available" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_by_id" integer,
  	"search_text" varchar,
  	"normalized_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "starlight"."enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "starlight"."products_locales" (
  	"name" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "starlight"."products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "starlight"."_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_category_id" integer,
  	"version_price_iqd" numeric,
  	"version_is_available" boolean DEFAULT false,
  	"version_featured" boolean DEFAULT false,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_by_id" integer,
  	"version_search_text" varchar,
  	"version_normalized_name" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "starlight"."enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "starlight"."enum__products_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "starlight"."_products_v_locales" (
  	"version_name" varchar,
  	"version_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "starlight"."_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "starlight"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT false,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "starlight"."categories_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "starlight"."cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"fee_iqd" numeric,
  	"free_delivery_confirmed" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT false,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "starlight"."cities_locales" (
  	"name" varchar NOT NULL,
  	"normalized_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "starlight"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"prefix" varchar DEFAULT 'products',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_w320_url" varchar,
  	"sizes_w320_width" numeric,
  	"sizes_w320_height" numeric,
  	"sizes_w320_mime_type" varchar,
  	"sizes_w320_filesize" numeric,
  	"sizes_w320_filename" varchar,
  	"sizes_w640_url" varchar,
  	"sizes_w640_width" numeric,
  	"sizes_w640_height" numeric,
  	"sizes_w640_mime_type" varchar,
  	"sizes_w640_filesize" numeric,
  	"sizes_w640_filename" varchar,
  	"sizes_w1280_url" varchar,
  	"sizes_w1280_width" numeric,
  	"sizes_w1280_height" numeric,
  	"sizes_w1280_mime_type" varchar,
  	"sizes_w1280_filesize" numeric,
  	"sizes_w1280_filename" varchar
  );
  
  CREATE TABLE "starlight"."media_locales" (
  	"alt_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "starlight"."redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"old_slug" varchar NOT NULL,
  	"product_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "starlight"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "starlight"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "starlight"."enum_users_role" DEFAULT 'owner' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "starlight"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "starlight"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "starlight"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"categories_id" integer,
  	"cities_id" integer,
  	"media_id" integer,
  	"redirects_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "starlight"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "starlight"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "starlight"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "starlight"."shop_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"public_name" varchar DEFAULT 'Starlight Jewellery' NOT NULL,
  	"logo_id" integer,
  	"default_locale" "starlight"."enum_shop_settings_default_locale" DEFAULT 'ckb' NOT NULL,
  	"instagram_url" varchar DEFAULT 'https://www.instagram.com/sl_.jewellery/' NOT NULL,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "starlight"."shop_settings_locales" (
  	"about_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "starlight"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "starlight"."products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "starlight"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."products" ADD CONSTRAINT "products_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "starlight"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "starlight"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "starlight"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "starlight"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "starlight"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."_products_v" ADD CONSTRAINT "_products_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "starlight"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "starlight"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "starlight"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."categories" ADD CONSTRAINT "categories_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "starlight"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."cities" ADD CONSTRAINT "cities_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "starlight"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."cities_locales" ADD CONSTRAINT "cities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."redirects" ADD CONSTRAINT "redirects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "starlight"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "starlight"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "starlight"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "starlight"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "starlight"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "starlight"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "starlight"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "starlight"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "starlight"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "starlight"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "starlight"."shop_settings" ADD CONSTRAINT "shop_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "starlight"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."shop_settings" ADD CONSTRAINT "shop_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "starlight"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "starlight"."shop_settings_locales" ADD CONSTRAINT "shop_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "starlight"."shop_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_category_idx" ON "starlight"."products" USING btree ("category_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "starlight"."products" USING btree ("slug");
  CREATE INDEX "products_published_at_idx" ON "starlight"."products" USING btree ("published_at");
  CREATE INDEX "products_updated_by_idx" ON "starlight"."products" USING btree ("updated_by_id");
  CREATE INDEX "products_search_text_idx" ON "starlight"."products" USING btree ("search_text");
  CREATE INDEX "products_normalized_name_idx" ON "starlight"."products" USING btree ("normalized_name");
  CREATE INDEX "products_updated_at_idx" ON "starlight"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "starlight"."products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "starlight"."products" USING btree ("_status");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "starlight"."products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "starlight"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "starlight"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "starlight"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "starlight"."products_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_parent_idx" ON "starlight"."_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_category_idx" ON "starlight"."_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "starlight"."_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_published_at_idx" ON "starlight"."_products_v" USING btree ("version_published_at");
  CREATE INDEX "_products_v_version_version_updated_by_idx" ON "starlight"."_products_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_products_v_version_version_search_text_idx" ON "starlight"."_products_v" USING btree ("version_search_text");
  CREATE INDEX "_products_v_version_version_normalized_name_idx" ON "starlight"."_products_v" USING btree ("version_normalized_name");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "starlight"."_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "starlight"."_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "starlight"."_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "starlight"."_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "starlight"."_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "starlight"."_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "starlight"."_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "starlight"."_products_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "starlight"."_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "starlight"."_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "starlight"."_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "starlight"."_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "starlight"."_products_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "starlight"."categories" USING btree ("slug");
  CREATE INDEX "categories_is_active_idx" ON "starlight"."categories" USING btree ("is_active");
  CREATE INDEX "categories_updated_by_idx" ON "starlight"."categories" USING btree ("updated_by_id");
  CREATE INDEX "categories_updated_at_idx" ON "starlight"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "starlight"."categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "starlight"."categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cities_is_active_idx" ON "starlight"."cities" USING btree ("is_active");
  CREATE INDEX "cities_updated_by_idx" ON "starlight"."cities" USING btree ("updated_by_id");
  CREATE INDEX "cities_updated_at_idx" ON "starlight"."cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "starlight"."cities" USING btree ("created_at");
  CREATE INDEX "cities_normalized_name_idx" ON "starlight"."cities_locales" USING btree ("normalized_name","_locale");
  CREATE UNIQUE INDEX "cities_locales_locale_parent_id_unique" ON "starlight"."cities_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "cities_locales_name_unique" ON "starlight"."cities_locales" USING btree ("_locale","normalized_name");
  CREATE INDEX "media_updated_at_idx" ON "starlight"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "starlight"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "starlight"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_w320_sizes_w320_filename_idx" ON "starlight"."media" USING btree ("sizes_w320_filename");
  CREATE INDEX "media_sizes_w640_sizes_w640_filename_idx" ON "starlight"."media" USING btree ("sizes_w640_filename");
  CREATE INDEX "media_sizes_w1280_sizes_w1280_filename_idx" ON "starlight"."media" USING btree ("sizes_w1280_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "starlight"."media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "redirects_old_slug_idx" ON "starlight"."redirects" USING btree ("old_slug");
  CREATE INDEX "redirects_product_idx" ON "starlight"."redirects" USING btree ("product_id");
  CREATE INDEX "redirects_updated_at_idx" ON "starlight"."redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "starlight"."redirects" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "starlight"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "starlight"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "starlight"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "starlight"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "starlight"."users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "starlight"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "starlight"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "starlight"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "starlight"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "starlight"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "starlight"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "starlight"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "starlight"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "starlight"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "starlight"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "starlight"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "starlight"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "starlight"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "starlight"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "shop_settings_logo_idx" ON "starlight"."shop_settings" USING btree ("logo_id");
  CREATE INDEX "shop_settings_updated_by_idx" ON "starlight"."shop_settings" USING btree ("updated_by_id");
  CREATE UNIQUE INDEX "shop_settings_locales_locale_parent_id_unique" ON "starlight"."shop_settings_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "starlight"."products" CASCADE;
  DROP TABLE "starlight"."products_locales" CASCADE;
  DROP TABLE "starlight"."products_rels" CASCADE;
  DROP TABLE "starlight"."_products_v" CASCADE;
  DROP TABLE "starlight"."_products_v_locales" CASCADE;
  DROP TABLE "starlight"."_products_v_rels" CASCADE;
  DROP TABLE "starlight"."categories" CASCADE;
  DROP TABLE "starlight"."categories_locales" CASCADE;
  DROP TABLE "starlight"."cities" CASCADE;
  DROP TABLE "starlight"."cities_locales" CASCADE;
  DROP TABLE "starlight"."media" CASCADE;
  DROP TABLE "starlight"."media_locales" CASCADE;
  DROP TABLE "starlight"."redirects" CASCADE;
  DROP TABLE "starlight"."users_sessions" CASCADE;
  DROP TABLE "starlight"."users" CASCADE;
  DROP TABLE "starlight"."payload_kv" CASCADE;
  DROP TABLE "starlight"."payload_locked_documents" CASCADE;
  DROP TABLE "starlight"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "starlight"."payload_preferences" CASCADE;
  DROP TABLE "starlight"."payload_preferences_rels" CASCADE;
  DROP TABLE "starlight"."payload_migrations" CASCADE;
  DROP TABLE "starlight"."shop_settings" CASCADE;
  DROP TABLE "starlight"."shop_settings_locales" CASCADE;
  DROP TYPE "starlight"."_locales";
  DROP TYPE "starlight"."enum_products_status";
  DROP TYPE "starlight"."enum__products_v_version_status";
  DROP TYPE "starlight"."enum__products_v_published_locale";
  DROP TYPE "starlight"."enum_users_role";
  DROP TYPE "starlight"."enum_shop_settings_default_locale";`)
}
