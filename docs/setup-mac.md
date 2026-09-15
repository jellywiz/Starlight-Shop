# Developer setup on macOS (from zero)

Everything runs locally without Docker, Homebrew or a database server: PostgreSQL is
downloaded as an npm package and started by `pnpm dev`.

## 1. Install Node.js (22 LTS or newer)

1. Go to https://nodejs.org and download the **macOS Installer (.pkg)** (choose the Apple
   Silicon build on M-series Macs, Intel otherwise). Node 22 LTS or any newer release works.
2. Run the installer with the default options.
3. Open **Terminal** (Applications → Utilities → Terminal) and check:

   ```bash
   node -v      # v22.x.x or newer
   ```

   If you prefer a version manager, `nvm install 22` or `fnm install 22` also work.

## 2. Install pnpm

```bash
npm install -g pnpm@10
pnpm -v      # 10.x
```

(Recent Node releases no longer bundle Corepack, so install pnpm with npm as above.)

## 3. Install the project

```bash
cd ~/Desktop/"Dler Camera"      # or wherever the project folder lives; the folder name does not matter
pnpm install
```

The first install downloads the PostgreSQL 17 binaries (about 40 MB) and builds `sharp`.
If pnpm asks to approve build scripts, allow `sharp`, `esbuild`, `unrs-resolver` and the
`@embedded-postgres/*` packages (they are already whitelisted in `package.json`).

## 4. Configure the environment

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `.env` as `PAYLOAD_SECRET`. Leave `DATABASE_URI` as it is
for local work (the embedded database is created with exactly the user, password and
database name written there); the S3 variables stay empty locally (images are stored in
`./media`).

**Upgrading from the earlier Dler Camera build in the same folder?** The Starlight tables
live in a new `starlight` schema, so `pnpm dev` simply creates them next to the old ones.
For a clean start, stop the app, run `pnpm db:reset` once (Ctrl+C when it says PostgreSQL is
running), delete the old `media` folder, and copy `.env.example` to `.env` again (keeping
your `PAYLOAD_SECRET`).

## 5. Run

```bash
pnpm dev
```

This starts the embedded database (data lives in `.data/pg`), applies the migrations in
`src/migrations`, and runs Next.js at http://localhost:3000. Stop with Ctrl+C.

Optional sample content and a development owner account:

```bash
pnpm seed:dev --owner        # dev@example.com / Dev-password-1 (local only)
```

Then sign in at http://localhost:3000/admin. The sample products, categories and the two
sample delivery cities (one with a confirmed zero fee) are clearly labelled and must never
be used on the real site.

## 6. Checks

```bash
pnpm typecheck && pnpm lint   # types and lint
pnpm test:unit                # whole-dinar parsing, search normalization, ranking, URL validation
pnpm test:int                 # publication rules, access control, search, delivery cities — on a throwaway DB
pnpm build && pnpm start      # production build (then pnpm test:e2e in another terminal)
```

## Troubleshooting

- **Port 54329 already in use**: another `pnpm dev`/`pnpm db:start` is running. Stop it, or set
  `LOCAL_PG_PORT` in `.env` to a free port and update `DATABASE_URI` accordingly.
- **Database refuses to start after a crash**: `pnpm db:reset` deletes `.data/pg` and creates a
  fresh empty cluster (local data is lost; the seed can be re-run).
- **"PAYLOAD_SECRET must be at least 32 characters"**: regenerate it as in step 4.
- **Images do not show in the admin**: local uploads are written to `./media`; make sure the
  folder is writable and that `S3_BUCKET` is empty in `.env`.
- **`sharp` fails to install**: run `pnpm rebuild sharp`; on Intel Macs make sure Rosetta is
  not forcing an arm64 Node binary.
