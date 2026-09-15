# Implementation decisions

Where the code refines or deliberately departs from the letter of the specification
(Starlight Jewellery "Website implementation" v2.0, 15 September 2026), and why. Everything
else follows the spec as written.

## Versions pinned

Payload 3.89.0, Next.js 16.3.5 (Payload's peer range), React 19.3.0, Node 22 LTS or newer
(the owner's Mac runs Node 26), pnpm 10, Tailwind CSS 4.3, PostgreSQL 17 (embedded locally;
Supabase runs 17). Exact versions are in `package.json` and `pnpm-lock.yaml`.

## Converted from the Dler Camera build

The Starlight site reuses the infrastructure of the earlier Dler Camera implementation
(Payload/Next setup, security hooks, media pipeline, search normalization, localization
helpers, tests, deployment layout) and replaces the shop model. Because nothing was deployed,
the old migration was discarded and a single fresh migration creates the `starlight`
schema; the old `dler` schema, if present in a local database, is simply left untouched.

## Prices and delivery fees

- **Whole dinars stored as integers**: `priceIqd` and `feeIqd` are stored exactly as entered
  (25000), validated as safe integers in 0/1…999,999,999 on the server (also for draft
  saves, which Payload would otherwise skip) and in the admin field. Fractions, negatives,
  non-finite values and overflow are rejected before storage.
- **Display digits** (agreed with the owner): the amount is always ASCII digits with comma
  grouping and zero fraction digits, wrapped in a translated label — `IQD 25,000`,
  `25,000 دینار`, `25,000 د.ع` — inside a left-to-right isolate. Interface counts still use
  locale digits through `Intl`. Locale-aware grouping with Arabic-Indic digits was offered
  and declined so amounts read identically when switching language.
- **Zero fee** must be confirmed with a checkbox before a city can be activated; the site
  then shows "Free delivery" (never a blank or a missing amount).

## Search

- The product `searchText` holds every translation of the name and description; every
  query token must appear in it. `normalizedName` holds the normalized name per language as
  separate segments so ranking can test exact and prefix matches per language.
- **Relevance ranking is done in memory** over the bounded candidate set: exact name,
  name prefix, other name match, description match; ties newest-first, then id. At the
  spec's scale (about 100 products) this is deterministic and cheap.
- The normalization table (kaf/keheh, yeh variants, alef forms, teh marbuta, heh
  doachashmee, digits, diacritics, tatweel) is unchanged from the previous build and
  documented in `src/lib/catalog/normalize.ts`; distinct Sorani letters are never folded.

## Content model

- **Categories**: activation requires all three names; deactivation is refused while a
  published product uses the category (drafts may keep it but cannot be published until
  they get an active category); deletion is refused while any product, draft included,
  uses it, and the message shows the count. Public navigation and filters list only active
  categories that have at least one published product; a URL naming a missing or inactive
  category is a distinct `CATEGORY_UNAVAILABLE` state with a Clear category action, while
  an active but empty category simply shows zero results.
- **Delivery cities** are the Payload collection `cities` (labelled "Delivery cities") so
  that the public fixed-projection endpoint can live at `GET /api/delivery-cities` without
  colliding with Payload's generated `/api/<collection>` routes. Public reads (generated or
  custom) are active-only. Duplicate normalized names are rejected per language by a hook
  and by a database unique index on the localized table.
- **Slugs** are derived once from the English name (numeric suffix on collision, since
  names need not be unique) and never change automatically; a first save in Sorani or
  Arabic waits for the English name.
- **Publication completeness** and **draft-over-published** behaviour are unchanged from
  the previous build (collection hooks reading every locale; Payload versions).
- **Shop settings** hold only name, logo, Instagram URL (validated as HTTPS `instagram.com`
  with a username path), introduction text and default locale; the handle shown on the site
  is derived from the URL. `updatedBy` is stamped on settings, categories and cities.

## Instagram and delivery UI

- The Instagram action is a plain HTTPS link to the confirmed profile with
  `rel="noopener noreferrer external"`, `target="_blank"` and an "opens Instagram" hint. No
  prefilling, API or tracking. "Copy product link" copies the canonical URL built from
  `SITE_URL`; when the clipboard is unavailable a selectable read-only field appears.
- The home delivery selector keeps the chosen city in `?city=<id>` through
  `history.replaceState`, so the language switcher (which copies the query string)
  preserves the selection by internal id. Only an id of a currently active city is
  accepted; anything else clears the selection with the "no longer listed" message.
  Without JavaScript the same form submits as a GET to `/<locale>#delivery`.

## Visual design (agreed with the owner)

- White/off-white pages, the logo's dark plum (#482044) for buttons, links and accents,
  lilac panels, a plum gradient hero and a deep-plum footer, and decorative four-point
  "sparkle" stars that twinkle gently. Sparkles are `aria-hidden`, positioned with logical
  insets (so they mirror in RTL), kept away from headings and buttons, and completely
  still under `prefers-reduced-motion`. Product photos always sit on white with contain
  sizing.
- **Logo**: the supplied raster (light, non-transparent background) is used as-is on light
  surfaces; on purple it sits in a white rounded tile. `scripts/brand-assets.ts` produces
  the website derivatives — crops and downscales only, never upscaled or recoloured. The
  favicon and header mark are a crop of the SL monogram with its stars. The copy shipped in
  this build was extracted from the specification PDF (794×845 JPEG) and should be
  replaced by the original 992×1056 file by re-running `pnpm brand:assets`.
- Fonts stay Noto Sans / Noto Sans Arabic (verified Sorani coverage); no serif display
  font was added because it would need a matching Arabic-script face.

## Security and operations

- First-user registration is blocked by a hook; only `pnpm owner:create` can create the
  first owner. Password reset stays disabled until an email provider exists.
- The application's tables live in the `starlight` schema created by the first migration
  (Payload marks `schemaName` as experimental; a fresh Supabase project satisfies it).
- A local `pnpm build`/`pnpm start` without S3 variables falls back to disk storage with a
  warning; on Netlify (`REQUIRE_S3_STORAGE=true`) the build fails instead.
- `/api/catalog` and `/api/delivery-cities` share a best-effort in-memory throttle; the
  free hosting plan has no platform rate limiting.
- The embedded development database is created with the user, password and database name
  found in `.env`'s `DATABASE_URI`, so a developer's existing `.env` keeps working.

## Free-tier operating notes

- Netlify free plan: 300 credits/month, 15 credits per production deploy; previews are
  unlimited. Deploy to production only at milestones.
- Supabase free plan pauses inactive projects after about a week; the spec forbids
  artificial keep-alive traffic, so a quiet week takes the catalogue offline until the
  owner resumes it. The contact page and the Instagram action keep working from built-in
  values.
