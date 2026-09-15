# Starlight Jewellery — catalogue website and admin panel

Trilingual (Sorani Kurdish, Arabic, English) catalogue for Starlight Jewellery's handmade
jewellery and accessories, with a private admin panel. Catalogue and Instagram enquiries
only: visitors browse products with Iraqi dinar prices, check delivery fees by city on the
home page and message the shop on Instagram. Built from the "Website implementation"
specification v2.0 (15 September 2026).

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript), Tailwind CSS 4 |
| CMS / admin | Payload CMS 3 at `/admin`, PostgreSQL via `@payloadcms/db-postgres` |
| Database | PostgreSQL 17 — embedded locally, Supabase in production (schema `starlight`) |
| Images | Supabase Storage through the S3 adapter (local disk in development) |
| Hosting | Netlify (free plan, `starlight-jewellery.netlify.app` desired), code on GitHub |
| Node / pnpm | Node 22 LTS or newer, pnpm 10 (pinned in `package.json`) |

## Quick start (macOS)

Full step-by-step instructions, including installing Node from scratch: **[docs/setup-mac.md](docs/setup-mac.md)**.

```bash
npm install -g pnpm@10        # once, after installing Node
pnpm install                  # installs dependencies and the embedded PostgreSQL binaries
cp .env.example .env          # then set PAYLOAD_SECRET to a long random string
pnpm dev                      # starts PostgreSQL, applies migrations, runs Next.js on :3000
pnpm seed:dev --owner         # optional: sample data + dev owner dev@example.com / Dev-password-1
```

Open http://localhost:3000 (site, redirects to `/ckb`) and http://localhost:3000/admin.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local development: embedded PostgreSQL + migrations + `next dev` |
| `pnpm db:start` / `pnpm db:reset` | Run (or wipe and run) the local database alone |
| `pnpm migrate` / `pnpm migrate:create <name>` | Apply / generate committed migrations (`src/migrations`) |
| `pnpm generate:types` / `pnpm generate:importmap` | Regenerate `src/payload-types.ts` / the admin import map after config changes |
| `pnpm owner:create` | Create the first owner account (see docs/deployment.md) |
| `pnpm owner:reset-password` | Maintainer password reset (no email provider is configured) |
| `pnpm seed:dev [--owner]` | Synthetic sample content (products, two sample cities) for local work only |
| `pnpm brand:assets` | Regenerate logo derivatives and favicons from `public/brand/logo.png` |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |
| `pnpm test:unit` / `pnpm test:int` / `pnpm test` | Unit tests; integration tests on a throwaway database |
| `pnpm test:e2e` | Playwright browser journeys against a running site |
| `pnpm build` / `pnpm start` | Production build / serve |
| `./scripts/backup.sh` | Database dump + storage copy with manifest |

## Repository layout

```
src/app/(site)/[locale]/     public pages: home (with delivery fees), products, products/[slug], about, contact
src/app/(payload)/           Payload admin and REST API routes (generated wrappers)
src/collections/             Products, Categories, DeliveryCities (slug "cities"), Media, Redirects, Users
src/globals/ShopSettings.ts  public name, logo, Instagram profile, introduction text, default language
src/endpoints/               GET /api/catalog and GET /api/delivery-cities (fixed public projections)
src/hooks/                   product publication rules, localized-data helpers, category integrity guards
src/lib/catalog/             normalization, whole-dinar handling, URL params, queries, projections, ranking
src/i18n/                    locale config and ckb/ar/en interface dictionaries
src/components/site|admin    site UI (sparkles, delivery selector, Instagram actions) and admin dinar fields
src/migrations/              committed PostgreSQL migrations (never edit applied ones)
src/fonts/                   self-hosted Noto Sans / Noto Sans Arabic
public/brand/                supplied logo and its derivatives, favicons, social preview image
scripts/                     dev database, owner bootstrap, backups, seed, brand assets, translation export
tests/unit|int|e2e           Vitest unit + integration, Playwright journeys
docs/                        setup, deployment, operations, acceptance, decisions, translations
```

## Documentation

- [docs/setup-mac.md](docs/setup-mac.md) — developer setup from a clean Mac
- [docs/deployment.md](docs/deployment.md) — GitHub, Supabase and Netlify setup, environment contract, release steps
- [docs/operations.md](docs/operations.md) — owner daily guide (products, categories, city fees, Instagram), backups and restore, password recovery, quotas
- [docs/acceptance.md](docs/acceptance.md) — acceptance test matrix A01–A25 with evidence
- [docs/decisions.md](docs/decisions.md) — implementation decisions and where they refine the spec
- [docs/translations-review.md](docs/translations-review.md) — every interface string for native review

## Status

Stages 1–4 of the delivery sequence (foundation, content model, public catalogue, delivery
fees and languages) are implemented and tested locally. The owner's review of
`docs/translations-review.md`, the provider accounts, real content and the hosting proof
described in docs/deployment.md remain for stage 5 (launch readiness).
