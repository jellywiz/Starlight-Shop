# Deployment: GitHub, Supabase and Netlify

Follows spec sections 13 and 14. Everything starts on free plans; provider limits were
rechecked on 15 September 2026 and must be rechecked at launch.

## Environment contract

| Variable                                   | Where it lives                      | Purpose                                                                                |
| ------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URI`                             | Netlify site env, maintainer `.env` | Runtime PostgreSQL connection (Supabase **transaction pooler**, port 6543)             |
| `DATABASE_MIGRATION_URI`                   | maintainer `.env` only              | Migration connection (Supabase **session pooler**, port 5432). Never stored in Netlify |
| `PAYLOAD_SECRET`                           | Netlify, maintainer `.env`          | 32+ character random secret for admin authentication                                   |
| `SITE_URL`                                 | Netlify, maintainer `.env`          | Canonical HTTPS origin, e.g. `https://starlight-jewellery.netlify.app`                 |
| `S3_ENDPOINT`                              | Netlify, maintainer `.env`          | Supabase S3 endpoint `https://<ref>.storage.supabase.co/storage/v1/s3`                 |
| `S3_REGION`                                | Netlify, maintainer `.env`          | Region shown in Supabase → Storage → S3 settings                                       |
| `S3_BUCKET`                                | Netlify, maintainer `.env`          | Public bucket name, e.g. `product-images`                                              |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Netlify, maintainer `.env`          | S3 access keys created in Supabase Storage settings                                    |
| `MEDIA_PUBLIC_BASE_URL`                    | Netlify, maintainer `.env`          | `https://<ref>.supabase.co/storage/v1/object/public/<bucket>`                          |
| `ENABLE_PASSWORD_RESET`                    | optional                            | Keep `false` until an email provider exists                                            |
| `REQUIRE_S3_STORAGE`                       | set by `netlify.toml`               | Fails the build if storage is not configured                                           |

Never use a `NEXT_PUBLIC_` prefix for any of these. Production and preview contexts on
Netlify can hold different values (`SITE_URL` differs); preview deploys must never receive
production write credentials for experiments — use a second free Supabase project or the
local database for that.

## 1. GitHub

1. Create a **private** repository (e.g. `starlight-jewellery`) under the owner's account.
2. Push this folder:

   ```bash
   cd ~/Desktop/"Dler Camera"      # the project folder (rename it whenever you like)
   git init && git add -A && git commit -m "Starlight Jewellery website"
   git branch -M main
   git remote add origin git@github.com:<account>/starlight-jewellery.git
   git push -u origin main
   ```

   `.env`, `.data/`, `media/` and `backups/` are git-ignored; `pnpm-lock.yaml` and
   `src/migrations` are committed.

3. The included GitHub Actions workflow runs typecheck, lint, unit and integration tests on
   every push (free for private repos within the monthly minutes).

## 2. Supabase

1. Create an organization and a project in a region close to Erbil that Netlify's function
   region can reach quickly (eu-central-1 Frankfurt is a reasonable default). Save the
   database password in a password manager.
2. **Database connection strings** (Project settings → Database → Connect):
   - Transaction pooler (port 6543, IPv4) → `DATABASE_URI`
   - Session pooler (port 5432, IPv4) → `DATABASE_MIGRATION_URI`
     The direct connection host is IPv6-only and will not work from most home networks or
     from Netlify; always use the poolers.
3. **Storage**: create a bucket `product-images`, tick **Public bucket**. In Storage →
   Settings → S3 connection, enable S3 and create an access key pair. Note the endpoint and
   region → `S3_*` variables. `MEDIA_PUBLIC_BASE_URL` is
   `https://<project-ref>.supabase.co/storage/v1/object/public/product-images`.
4. **Data API**: Project settings → API → "Exposed schemas" must NOT include `starlight`.
   The application creates and owns the `starlight` schema through migrations; nothing is
   created by hand in the dashboard, and the browser never talks to Supabase directly.
5. Free-plan limits (15 Sep 2026): 500 MB database, 1 GB storage, 5 GB egress plus 5 GB
   cached egress, projects pause after a week of low activity, no automatic backups. See
   docs/operations.md for the weekly checks and manual backups.

### Apply the schema

From the maintainer's machine. Pass the session-pooler connection string only for these
commands (an inline variable is safer than keeping it in `.env`; `pnpm dev` ignores it
either way, so local development can never touch production):

```bash
DATABASE_MIGRATION_URI='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' pnpm migrate:status
DATABASE_MIGRATION_URI='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' pnpm migrate
```

### Create the owner

```bash
DATABASE_MIGRATION_URI='postgresql://...same string...' OWNER_EMAIL=owner@example.com pnpm owner:create     # prompts for the password
```

The password must be long and unique (12+ characters, a passphrase is ideal). Public
registration is blocked in code; only this script can create the first account.

## 3. Netlify

1. Add a new project from the GitHub repository (owner's Netlify account). Build command
   `pnpm build`, publish directory `.next` — both are in `netlify.toml`. Node 22 is pinned there.
2. Site configuration → Environment variables: add every variable from the table above except
   `DATABASE_MIGRATION_URI`. Use the production context for the real values.
3. Project name: choose `starlight-jewellery` if available (→
   `starlight-jewellery.netlify.app`); otherwise the nearest free name. Set `SITE_URL` to that
   exact HTTPS origin and redeploy so cookies, CORS/CSRF origins, canonical links and copied
   product links match.
4. Deploy. Production deploys cost 15 credits each on the free plan (300 credits/month), so
   use deploy previews and branch deploys (unlimited) for testing and promote to production
   only at milestones.

### Where the functions and the database run

Netlify runs the site's serverless functions in **Ohio (`cmh`)** unless told otherwise,
and the Supabase project was created in **Frankfurt**. Every database round trip then
crosses the Atlantic (about 100 ms), and a page or an admin action makes several of them
in a row — this was the main reason the site felt slow (docs/decisions.md "Performance").
Put the two in the same place, in one of these ways:

- **Netlify Pro** ($19 per member per month): Cloud compute → Functions → Region →
  Configure → **Frankfurt (fra)**, Save, then redeploy. Region selection is not offered
  on the free plan.
- **Free: move Supabase next to the functions.** Create a new Supabase project in **East
  US (Ohio)**, then move the data:
  1. `./scripts/backup.sh` against the current project (database dump + images).
  2. In the new project: create the public bucket `product-images`, enable S3 access and
     create a key pair (Storage → Settings), note the pooler connection strings.
  3. Restore the database into the new project's session pooler (the dump carries the
     `starlight` schema and the migration history, so no `pnpm migrate` is needed):
     `pg_restore --no-owner --no-privileges --dbname "$NEW_SESSION_POOLER_URI" backups/<timestamp>/db.dump`
  4. Upload the images with the new project's `S3_*` values in your `.env`:
     `pnpm restore:storage backups/<timestamp>/storage`
  5. Netlify → Environment variables: `DATABASE_URI`, `S3_ENDPOINT`, `S3_REGION`,
     `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL` → the new project;
     redeploy. Update `DATABASE_MIGRATION_URI` in your `.env`. Verify (section 4), then
     pause or delete the Frankfurt project.

Either way, expect admin actions and uncached pages to lose roughly half a second each.
Product, About and Contact pages are served by the CDN without touching the function at
all after the first visit (they are refreshed the moment content changes), so they are
fast in both setups.

**Keep the function warm.** The free plan cannot keep a function running between
visits; after a quiet spell the first visitor waits for a cold start (one to two extra
seconds). A free uptime monitor (for example UptimeRobot) requesting
`https://starlight-jewellery.netlify.app/en` every 5 minutes keeps it warm most of the
time and doubles as a downtime alert. Set it up once in the owner's account.

## 4. Hosting proof (do this before loading real content)

The spec requires proving the free deployment before full implementation. With a test
Supabase project and a preview deploy:

1. Owner login at `/admin` works over HTTPS; `/admin/forgot` is hidden and
   `POST /api/users/first-register` returns 403.
2. Create one category, one product in all three languages and one delivery city; upload
   one image (JPEG, 2–3 MB) — the file appears in the Supabase bucket and renders on the
   public page with the `w320/w640/w1280` variants.
3. Publish, then open `/en/products/<slug>` in a private window: fresh values (product
   pages are cached by the CDN, and publishing invalidates them).
   Select the city on the home page and check the fee; open the Instagram action on a phone
   and on a desktop.
4. Measure a cold request to the admin and to a catalog page (Netlify function logs show
   duration); confirm uploads finish well inside the synchronous function timeout. If large
   uploads time out, lower `MAX_UPLOAD_PIXELS` in `src/collections/Media.ts` (e.g. 12 MP)
   and tell the owner to resize photos before uploading.
5. Check Netlify credit usage after the test and note the per-deploy cost.

## 5. Release procedure

1. `./scripts/backup.sh` (database + storage) before any migration.
2. `pnpm migrate` against production (`DATABASE_MIGRATION_URI`). Migrations must stay
   backward compatible with the currently deployed code, because a code rollback does not
   undo a migration.
3. Merge to `main` → Netlify builds a production deploy (15 credits). Verify the live site.
4. Roll back with "Publish deploy" on a previous known-good deploy in Netlify if needed.

## 6. Custom domain later

Buy the domain, add it in Netlify (Domain management), then update `SITE_URL` and redeploy.
Old `netlify.app` links keep working through Netlify's automatic redirect.
