# Operations and owner guide

## Daily owner guide (admin at `/admin`)

The admin works on a phone, an iPad and a computer. After logging in, the home screen
shows **Add a product**, the counts of products, photos, categories and delivery cities,
and a link to the public website; the menu (☰) lists the same sections.

**Add a product.** Products → Create new (or Add a product on the home screen). Choose the category (create and activate it first
under Categories if missing), then enter the name and description: each has three inputs on
the same page — Sorani (کوردی), Arabic (العربية) and English — so everything is written on one
form and saved once. Further down, enter the price in whole Iraqi dinars (e.g. `25000`,
no decimals), tick **Available** if the piece can be ordered, and under Photos add the
pictures (JPEG/PNG/WebP; the first photo is the cover). Photos straight from a phone camera
are fine: a large photo is reduced automatically in the browser before it is uploaded — the
panel above the file shows a preview, "Preparing…", what it was reduced to, and a progress
bar while it uploads. Photos that are already small (up to 3 MB and 20 megapixels) are sent
exactly as they are. Each picture is uploaded once and shared by all three languages; the
optional "Image description" under Media is a single text for all languages, and when it is
empty the site uses the product name in the page's language. The checklist at the top of
the form shows what Publish still needs — the languages of the name and description, a
category, photos, the price, Available ticked or unticked — and updates as you type.
**Save Draft** at any time; drafts are private. **Publish** makes the product public once
the checklist reads "Ready to publish" — if anything is still missing, the error lists
exactly which fields and languages. Use the preview button (arrow icon next to Save Draft)
to see the latest draft on the site as an administrator, then check the public page and the
Instagram action.

**Photos on the website.** Visitors swipe between a product's photos on a phone (or use the
arrows and thumbnails), and tapping a photo opens it large: pinch or double-tap to zoom,
drag to move around, swipe for the next photo; on a computer the mouse wheel zooms and the
arrow keys, `+`, `-` and `0` do the same.

**The home page's featured pieces.** Tick **Featured** on a product (under Price and
availability) and Publish: the piece joins the tile at the top of the home page, which
shows the featured pieces one after another (newest first, up to eight, changing every few
seconds; visitors can also flick through them or pause), and the Featured pieces row below
it. Untick Featured and Publish to take it out again. A featured product without a photo is
skipped by the tile.

**Change a price or availability.** Open the product, change the value, then Publish. Save
Draft alone does not change the public page. A fresh page load shows the new value.

**Hide a product.** Use the ⋮ menu → Unpublish. Unavailable products stay visible with an
"Unavailable" label; only Unpublish removes a product from the site. Deleting is possible
but keeps the images; prefer Unpublish.

**Web addresses** are automatic. A product's address (`/en/products/pink-heart-necklace`)
comes from its English name while it is a draft and is fixed from the first publication
on, so links already shared keep working even if the product is renamed. The same applies
to category addresses from the first activation. Use the preview button or the public
page's "Copy product link" to get the address.

**Categories.** Categories → Create new: enter the three names (one form), choose the
position (sort order) and tick Active. Only active categories with at least one published
product appear in the website's navigation and filters; empty categories can be kept for
later. Renaming updates the public label on the next request. A category used by published
products cannot be deactivated, and one used by any product (including drafts) cannot be
deleted — the error shows the product count; reassign those products first.

**Delivery fees.** Delivery cities → Create new: enter the city name in Sorani, Arabic and
English, the delivery fee in whole dinars (e.g. `5000`) and the position, then tick Active
and Save. The city appears in the home page selector on the next request — no
redeployment. To change a fee, edit the city and Save. To stop showing a city, untick
Active (or delete it after confirming). A fee of `0` must be confirmed with the "free
delivery" checkbox before the city can be activated; the site then shows "Free delivery".
Fees are information only: they are never added to product prices and no total is shown.

**Shop settings.** Administration → Shop settings: public name, optional logo replacement,
the Instagram profile URL (must be an HTTPS `instagram.com` address; the handle shown on the
site is taken from it), the introduction text in all three languages and the default
language. Test the public Instagram link on a phone and on a desktop after saving.

**Difference between products and everything else.** Products have drafts: nothing changes
publicly until Publish. Categories, delivery cities and shop settings have no drafts: Save
is live on the next page request.

**Light and dark mode.** The admin follows the phone's or computer's setting until you
choose otherwise: open the menu (☰) and under **Appearance** pick Light, Dark or Auto
(Auto = follow the device again). The choice is remembered in that browser. Visitors of
the website have the same thing: the moon/sun button in the header switches the site
between light and dark and remembers the choice in their browser; until they touch it the
site follows their device. Neither choice is stored on the server, so it never needs
resetting for anyone.

**Speed.** Product pages, About and Contact are served from Netlify's cache and refreshed
automatically when you publish or change something, so they open quickly even when the
site has been idle. The home page and the catalogue with filters are built on every visit
and depend on the database; after a quiet spell the first visit may take a couple of
seconds while the hosting starts the site (a free uptime ping keeps it awake, see
docs/deployment.md). If everything feels slow again, check the two regions (functions and
database) described there first.

## Weekly checks (owner or maintainer)

- Netlify → Usage: stay below 70 % of the monthly credits (300 on Free). Production
  deploys cost 15 credits each.
- Supabase → Project home: database size, storage size, egress. Watch for the
  "project paused" notice: free projects pause after a week of low activity. Resume from
  the dashboard, then check the public site, the delivery selector and an admin save.
- After a large editing session (including city-fee changes): run a backup (below).

If Netlify credits run out the site pauses until the monthly reset or an upgrade. If
Supabase pauses, the site shows the "catalogue temporarily unavailable" message with the
Instagram fallback, and the contact page keeps working with the built-in Instagram
destination.

## Backups (no automatic backups on the free plans)

Requirements on the maintainer's Mac: `brew install libpq` (adds `pg_dump`/`pg_restore`;
add `/opt/homebrew/opt/libpq/bin` to `PATH`) and a `.env` containing
`DATABASE_MIGRATION_URI` and the `S3_*` values.

```bash
./scripts/backup.sh
```

Creates `backups/<timestamp>/db.dump` (schema `starlight`, custom format: products,
categories, delivery cities, settings and administrator records) and
`backups/<timestamp>/storage/` (every image plus `manifest.json`). Move the folder to an
encrypted, owner-controlled location outside the repository. Keep the last seven session
backups and one monthly copy. The dump contains administrator password hashes: treat it as
confidential.

### Restore (always into an isolated project first)

1. Create a scratch Supabase project (or a local database) and an empty bucket.
2. Database:

   ```bash
   pg_restore --no-owner --no-privileges --dbname "$SCRATCH_SESSION_POOLER_URI" backups/<timestamp>/db.dump
   ```

3. Images: with the scratch bucket's `S3_*` values in `.env`, run
   `pnpm restore:storage backups/<timestamp>/storage`; it uploads every object under its
   original key (the `products/` prefix is part of the key).
4. Point a preview deploy at the scratch project, sign in, verify product, category and
   city counts, fees, image samples and a search. Only then switch production configuration.

Object identifiers are preserved, so restored records reconnect to their files.

## Password recovery

Email delivery is not configured, so "Forgot password" is hidden and disabled. The
maintainer resets a password with database access:

```bash
OWNER_EMAIL=owner@example.com pnpm owner:reset-password
```

Never edit password hashes by hand. Before changing the administrator email or rotating
credentials, make sure this recovery path (a maintainer with `DATABASE_MIGRATION_URI`)
still works.

## Incident notes

- **Catalogue unavailable page**: database or storage unreachable. Check Supabase status
  and whether the project is paused; the Instagram fallback and static logo keep working.
  Product pages opened during the outage show the same state and recover by themselves on
  the next visit once the database is back; pages that were already cached keep working
  throughout.
- **"This function has crashed" on every page**: the site could not start at all. Open the
  Netlify function log (Logs → Functions → `___netlify-server-handler`). A line saying
  "cannot connect to Postgres: password authentication failed" means `DATABASE_URI`
  carries the wrong password (see docs/deployment.md "If the Netlify site is lost"); a
  line saying "Missing required environment variable" names a variable that is not set
  for the Functions scope.
- **Delivery fees show "could not load"**: same cause; the section offers Try again and
  Instagram and never shows a zero fee by mistake.
- **Uploads fail with "larger than 3 MB" / "more than 20 megapixels"**: the browser
  normally reduces a large photo before uploading, so this means the photo could not be
  read by the browser (a very old browser, or a file that is not really a JPEG/PNG/WebP).
  Export a smaller copy from the phone's gallery app and try again.
- **The photo panel stays on "Preparing…"**: the browser is still decoding a very large
  photo; on an old phone this can take several seconds. If it never finishes, reload the
  page and choose the photo again.
- **Publish refuses with missing languages**: the checklist at the top of the product form
  names them; fill the listed language inputs (name and description are the only
  per-language product fields).
- **City cannot be activated**: fill all three names and a valid whole-dinar fee; a zero
  fee needs the free-delivery confirmation.
- **Locked document**: another session is editing the same record; Payload warns about
  conflicting edits. Wait or take over the lock deliberately.
