# Deployment: GitHub, Supabase and Netlify

Follows spec sections 13 and 14. Everything starts on free plans; provider limits were
rechecked on 15 September 2026 and must be rechecked at launch.

## Environment contract

| Variable                                   | Where it lives                      | Purpose                                                                                |
| ------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URI`                             | Netlify site env, maintainer `.env` | Runtime PostgreSQL connection (Supabase **transaction pooler**, port 6543)             |
| `DATABASE_MIGRATION_URI`                   | maintainer `.env.live` only         | Migration connection (Supabase **session pooler**, port 5432). Never stored in Netlify |
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

Netlify is the only place the production values are stored (the maintainer's `.env` holds
local-development values). Keep a copy of every production value in the owner's password
manager: if the Netlify account or site is deleted, the values go with it (see "If the
Netlify site is lost" below).

## Maintainer commands against the live site

Migrations, backups, owner accounts and photo previews run from the maintainer's Mac
against the live Supabase project. The live credentials live in one git-ignored file,
`.env.live`, and the `:live` commands read it. Connection strings are never typed into the
terminal, where zsh would keep them in `~/.zsh_history`.

| Command                                                              | What it does                                              | Asks "yes"? |
| -------------------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `pnpm migrate:status:live`                                           | Lists which migrations the live database has run          | no          |
| `pnpm backup:live`                                                   | Live database dump + every photo → `backups/<timestamp>/` | no          |
| `pnpm migrate:live`                                                  | Backs up first, then applies new migrations               | yes         |
| `OWNER_EMAIL=… pnpm owner:create:live` (add `-- --allow-additional`) | Creates an owner account (prompts for the password)       | yes         |
| `OWNER_EMAIL=… pnpm owner:reset-password:live`                       | Sets a new password for an owner                          | yes         |
| `pnpm media:previews:live` (add `-- --force` to redo all)            | Blurred stand-ins for photos that have none               | yes         |

Every `:live` command prints the database host and bucket it is about to use, never the
password. It stops if `.env.live` is missing a value or points at this Mac's own database.
`scripts/live.sh` is the wrapper.

### One-time setup of `.env.live`

The file is called `.env.live`, not `.env.production`, on purpose: Next.js loads
`.env.production` automatically for `next build`/`next start`, which would quietly point
local builds at the live database.

1. Create the file from the template. It is git-ignored, so it can never be committed:

   ```bash
   cp .env.live.example .env.live
   chmod 600 .env.live          # readable by your user only
   open -e .env.live            # opens in TextEdit
   ```

2. **`DATABASE_MIGRATION_URI`**: Supabase dashboard → your project → **Connect** (top bar)
   → **Session pooler** (port **5432**, not 6543). Copy the URI and replace
   `[YOUR-PASSWORD]` with the database password from your password manager. If you no
   longer have the password, reset it in Project Settings → Database → **Reset database
   password**. Then update `DATABASE_URI` in Netlify too (same password, port 6543) and
   redeploy, or the live site loses its database.
3. **`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `MEDIA_PUBLIC_BASE_URL`**: Netlify → Site
   configuration → Environment variables. These four are not marked secret, so click each
   one and copy its value. They are also shown in Supabase → Storage → S3 connection.
4. **`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`**: in Netlify these are secret (padlock)
   and cannot be read back. Create a **new** key pair instead: Supabase → Storage → **S3
   connection** → Access keys → **New access key**, description `maintainer-mac`. Copy both
   values right away, because the secret is shown only once. A separate pair can be
   revoked at any time without touching the live site's own key.
5. Optional `SITE_URL`: the live address, so messages like "Sign in at …" show it instead
   of localhost.
6. Save the file and check it:

   ```bash
   pnpm migrate:status:live
   ```

   It should print `LIVE site: database aws-0-<region>.pooler.supabase.com:5432, bucket
product-images` and a table where every migration shows **Ran: Yes**.

Never paste `.env.live` into chats, tickets or screenshots, and don't keep it in a synced
or shared folder. If the Mac is lost, revoke the `maintainer-mac` key in Supabase and reset
the database password.

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

From the maintainer's Mac, after setting up `.env.live` (see "Maintainer commands against
the live site" above). `pnpm dev` never reads `.env.live`, so local development can never
touch production:

```bash
pnpm migrate:status:live
pnpm migrate:live          # backs up first, asks for "yes"
```

### Create the owner

```bash
OWNER_EMAIL=owner@example.com pnpm owner:create:live                           # first owner; prompts for the password
OWNER_EMAIL=second@example.com pnpm owner:create:live -- --allow-additional    # another owner
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

### If the Netlify site is lost

Deleting the Netlify site or account removes only the hosting and its environment
variables: the code is on GitHub, and the products, photos and the owner account are in
Supabase, untouched. To rebuild (about fifteen minutes):

1. Sign up again at netlify.com (with GitHub is simplest) → Add new project → Import an
   existing project → GitHub → authorise Netlify for the `Starlight-Shop` repository (if it
   is not listed: Configure the Netlify app on GitHub and add the repository).
2. Project name `starlight-jewellery` if it is free, otherwise the nearest free name; branch
   `main`; the build command and publish directory come from `netlify.toml`.
3. Add the environment variables **before the first deploy** (a build without them fails
   on purpose). Same value for all deploy contexts is fine while there is one Supabase
   project:
   - `SITE_URL` — `https://<project-name>.netlify.app`, exactly the address Netlify gives
     the site. Admin login (cookies, CSRF) and copied product links depend on it.
   - `PAYLOAD_SECRET` — a new random value is fine (generate one with the command shown in
     `.env.example`). It signs login sessions only; passwords live in the database, so the
     owner logs in as before.
   - `DATABASE_URI` — Supabase → Connect → Transaction pooler (port 6543). If the database
     password is unknown, reset it under Project settings → Database (then also use the new
     password in `DATABASE_MIGRATION_URI` on the maintainer's machine).
   - `S3_ENDPOINT`, `S3_REGION` — Supabase → Storage → Settings → S3 connection.
   - `S3_BUCKET` — `product-images` (check the bucket name under Storage).
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — the secret is shown once at creation, so
     create a new key pair (Storage → Settings → S3 access keys) and delete the old one.
   - `MEDIA_PUBLIC_BASE_URL` — `https://<project-ref>.supabase.co/storage/v1/object/public/product-images`.
   - `ENABLE_PASSWORD_RESET` — `false`.
4. Deploy, then check: `/en` shows the products with their photos, `/admin` login works,
   a test photo upload succeeds (delete it afterwards), a product page opens after
   Publish.
5. If the project name changed: update `SITE_URL` and redeploy, re-point the uptime
   monitor, and replace the old address in `.env.example` and this file.
6. Save every value in the owner's password manager this time.

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
`src/proxy.ts` (unknown-language paths → 404) runs as a Netlify edge function on every
page request; the free plan's edge allowance (a million invocations a month) is far above
this catalogue's traffic.
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

1. `pnpm migrate:status:live`: see which migrations are new.
2. `pnpm migrate:live`: backs up the live database and photos, asks for "yes", then
   migrates. Do this **before** pushing whenever the release adds a migration. Migrations
   must stay backward compatible with the code that is live, because a code rollback does
   not undo a migration.
3. Merge to `main` → Netlify builds a production deploy (15 credits). Verify the live site.
4. Roll back with "Publish deploy" on a previous known-good deploy in Netlify if needed.

One-off after the release of 4 October 2026 (blurred photo stand-ins), after the migration:

```bash
pnpm media:previews:live
```

The photos are read from the public bucket address (`MEDIA_PUBLIC_BASE_URL` in
`.env.live`). Plain `pnpm media:previews` works on the local development database and the
`media/` folder. Photos uploaded from then on get their stand-in automatically.

**Release of 19 November 2026 (Payload 3.93 / Next.js 16.4.6 security upgrade): migrate
first.** Migration `20261119_053647_payload_3_93` adds two empty columns
(`users.reset_password_requested_at`, `media._objectkey`). The new code reads the first one
on every login, so **the owner cannot sign in to the admin until the migration has run**.
The columns are additive and nullable, so running the migration before the deploy is safe
for the code that is live now. Applied to production on 19 November 2026.

**Release of 19 November 2026 (sign-in throttle, Enquire copies the link): migrate first.**
Migration `20261119_063610_login_throttle` creates the `login_throttle` table. The new code
uses it on every sign-in, so run `pnpm migrate:live` before pushing. The table is new and
unused by the code that is live now, so migrating first is safe.

## 6. Custom domain later

Buy the domain, add it in Netlify (Domain management), then update `SITE_URL` and redeploy.
Old `netlify.app` links keep working through Netlify's automatic redirect.
