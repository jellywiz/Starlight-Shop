# Improvement backlog

Code review of 18 November 2026 (commit `5848174`). Every item was found by reading the code
and cites `path:line` as of that commit (line numbers drift as the code changes). Items are
ordered by priority; effort is **S** (under an hour), **M** (a few hours) or **L** (a day or more).

**How to use this file:** when an item is done, tick it, add the date and commit, and note
anything that changed from the plan. If an item is rejected, mark it `Won't do` with the
reason, so the question isn't reopened later. Decisions that change behaviour also go in
[decisions.md](decisions.md).

Status legend: `[ ]` open · `[x]` done · `[-]` won't do

---

## P0 — Critical (fix before anything else)

- [x] **P0-1 Upgrade Next.js and Payload: published security flaws.** _Done 2026-11-19:_
      upgraded to `next 16.4.6`, `payload`/`@payloadcms/* 3.93.0`, `sharp 0.35.5`,
      `react 19.3.1`. `pnpm.overrides` added for `dompurify`, `fast-uri` and `source-map-js`.
      `pnpm audit --prod` went from 7 critical / 24 high to 0 / 0 (one moderate, dev-only
      esbuild in drizzle-kit). Added migration `20261119_053647_payload_3_93`, which **must be
      run on production before deploying** (docs/deployment.md §5). Stayed on 3.93 because
      3.94 needs Node ≥26.13.1 (docs/decisions.md). Follow-up: update Node, then move to the
      latest Payload.
      Original finding: `pnpm audit --prod`
      reports 7 critical and 24 high advisories, mainly in `next@16.3.5` (unauthenticated remote code
      execution in image optimisation and `use cache`, RCE in `next/og`, SSRF) and
      `payload@3.89.0` (unauthorised document updates, field-access bypass on auth
      collections, first-register RCE, SVG/XML upload script execution), plus
      `@payloadcms/storage-s3` (uploads overwriting objects) and `sharp <0.35.5`. Upgrade to
      `next ≥16.4.1`, `payload`/`@payloadcms/* ≥3.90.0`, `sharp ≥0.35.5`, then run the full check
      suite and the e2e journeys. Check Payload's supported Next range first. **Effort: M**

## P1 — High (real users are affected now)

- [ ] **P1-1 Anyone can lock the owner out of the admin.** `src/collections/Users.ts:19-20` locks
      the account after 5 failures for 15 minutes, and `/api/users/login` has no per-IP limit
      (`src/endpoints/throttle.ts` only covers the catalogue endpoints). Someone who knows the
      email can keep the only account locked indefinitely. Add a per-IP login throttle (a
      `beforeOperation` check for `login`, reusing `throttled()`) and consider a second owner
      account. **Effort: S**
- [ ] **P1-2 Edits can stay invisible for up to 24 h.** `src/hooks/revalidate.ts:39-44`
      revalidates in `afterChange`, which runs _before_ the transaction commits. A visitor
      arriving in that window re-caches the old page (`revalidate = 86400`). Revalidate after
      commit (`after()` from `next/server`) and lower the fallback revalidate time. **Effort: S**
- [ ] **P1-3 No automatic backups.** `docs/operations.md:116`; `scripts/backup.sh` is manual
      only. Add a scheduled GitHub Action (`pg_dump` + `backup:storage`, encrypted, stored
      off-site) and test a restore. **Effort: M**
- [ ] **P1-4 Mobile enquiry bar doesn't send the product.** `src/components/site/ProductView.tsx:137-150`:
      the sticky bar only opens the Instagram profile, though the page asks visitors to
      "send us this product link". Copy the canonical link (with a "Link copied" toast) before
      opening Instagram, or add a share/copy button to the bar. This is the main conversion
      path on phones. **Effort: S–M**
- [ ] **P1-5 Search Enter can open the wrong product.** `src/components/site/SiteSearch.tsx:253-256`
      keeps the highlighted suggestion while the visitor keeps typing; `:162` then opens it.
      Reset `active` to -1 on change, or ignore it while loading. **Effort: S**
- [ ] **P1-6 Price-range typing wipes the results.** `src/components/site/CatalogFilters.tsx:156`
      navigates 300 ms after each keystroke; a temporary min > max shows an error and hides
      the grid (`products/page.tsx:127-141`), and the alert appears twice. Validate in the form,
      keep the last good results, and announce the error once. **Effort: M**
- [ ] **P1-7 Phone filter dialog.** `CatalogFilters.tsx:382-433`: closing within 300 ms drops the
      last change; there's no "Show N results" button; the page behind can scroll on iOS.
      Flush the pending change on close, add a results-count button, and lock scrolling
      (`html:has(dialog[open]){overflow:hidden}`). **Effort: M**
- [ ] **P1-8 Home page title repeats the brand.** `(home)/page.tsx:48` plus the layout template
      `layout.tsx:33` → "Starlight Jewellery — … · Starlight Jewellery". Use
      `title: { absolute: … }`. Verify the rendered `<title>`. **Effort: S**
- [ ] **P1-9 Category pages can't rank in Google.** `src/app/robots.ts:13` disallows
      `/*/products?*`, and every filtered URL is `noindex` with a generic "Products" title. Make
      single-category pages indexable with their own title/h1/canonical (ideally
      `/products/category/<slug>`) and add them to the sitemap. **Effort: M**

## P2 — Medium (noticeable quality and reliability improvements)

### Visitors

- [ ] **P2-1 Language switcher hidden on phones/iPad.** `SiteHeader.tsx:86-103`: Arabic and English
      visitors land on Kurdish with no visible switch. Show a compact language button in the
      mobile header. **Effort: S**
- [ ] **P2-2 Bare paths 404.** `src/proxy.ts:15-18`: `/about`, `/products/x` without a locale show 404. Redirect known routes to `/{default}/…` with a 308. **Effort: S**
- [ ] **P2-3 `/` waits on the database just to redirect.** `src/app/(root)/page.tsx:5-10`
      (`force-dynamic`). This is the Instagram-bio entry URL. Redirect in the proxy or cache
      the default locale. **Effort: S–M**
- [x] **P2-4 Delivery fee check leaves the product page.** `ProductView.tsx:128-132`. Show the
      city fee selector (or a disclosure) on the product page. **Effort: M** — _Done 2026-11-18:
      `ProductView` embeds `DeliveryFees` (`syncUrl={false}`, `compact`) in a separate card
      beneath `#product-actions`; cities load in `Promise.all` on the product page and preview
      route, and `DeliveryCities` runs `revalidateAfterChange`/`revalidateAfterDelete`._
- [ ] **P2-5 Product JSON-LD has no `offers`/breadcrumb.** `ProductView.tsx:19-30`. Add price,
      `IQD`, availability and a `BreadcrumbList` so Google shows the price (needs owner
      sign-off; the spec said no offers). **Effort: S**
- [ ] **P2-6 Wrong images are loaded first.** - Home grid gives 2 below-the-fold cards `fetchpriority=high` (`(home)/page.tsx:195`). - The hidden zoom-dialog photo loads eagerly at high priority on every product page
      (`ProductGallery.tsx:434-439`).

      Drop both so the hero and main photo load first. **Effort: S**

- [ ] **P2-7 Slideshow.** - Pause when off-screen or the tab is hidden (`HeroSlideshow.tsx:90-97`). - Make the dots ≥24 px tap targets (`globals.css:207-208`). - Cross-fade instead of fading from blank (`:136-181`).

      **Effort: S**

- [ ] **P2-8 Gallery zoom.** - Arrow keys go the wrong way in RTL (`ProductGallery.tsx:138-141`). - Trackpad pinch also zooms the page and the wheel zooms too fast (`:287-292`). - The photo doesn't follow the finger during a swipe (`:164-178`).

      **Effort: S–M**

- [ ] **P2-9 Search suggestions accessibility.** `SiteSearch.tsx`: - Options are tab stops (`:285-326`). - The list doesn't close on blur (`:134-147`). - The live region is inside the hidden list (`:347`). - Failed loads show nothing (`:120-123`). - Stale suggestions flash (`:97-99`).

      **Effort: M**

- [ ] **P2-10 Removing the search chip resets the chosen sort.** `FilterChips.tsx:31`. Reset only
      `relevance`. Also drop `sort=relevance` from URLs without a query
      (`CatalogFilters.tsx:80-85`). **Effort: S**

### Owner / admin / reliability

- [ ] **P2-11 Hook queries don't pass `req`.** `hooks/slugs.ts:61`, `hooks/products.ts:94,120`,
      `hooks/references.ts:17`, `DeliveryCities.ts:77`, `Users.ts:64,69`,
      `Media.ts:130,144,155`. These run outside the save's transaction, use extra connections
      (the pool is 3), and races give raw database errors. Pass `req` everywhere and map
      unique-violation errors to friendly messages. **Effort: S**
- [ ] **P2-12 The generated REST API is wide open.** There's no `maxDepth`, `?limit=0` returns
      everything, and there's no throttle on `/api/<collection>`; `/api/media` lists photos of
      unpublished products (`Media.ts:179`). Set `maxDepth: 2` and a default limit, and deny
      anonymous REST reads except the two public endpoints. **Effort: S**
- [ ] **P2-13 Security headers.** `next.config.ts` has no HSTS or CSP. Add HSTS and a CSP
      (`frame-ancestors 'self'; object-src 'none'; base-uri 'self'`, storage domain in
      `img-src`), using report-only first for `/admin`. **Effort: M**
- [ ] **P2-14 CI / release gaps.** `.github/workflows/ci.yml`: no check that migrations match
      the config, no `pnpm audit`, no Dependabot; deploys aren't gated on `pnpm migrate`
      (`netlify.toml`). **Effort: M**
- [ ] **P2-15 Photos can't be deleted after appearing in old versions.** `Media.ts:144-153`
      plus 10 kept versions (`Products.ts:55`). Block deletion only for current
      drafts/published/logo, or name the product in the message. **Effort: S**

## P3 — Low (polish)

- [ ] **P3-1 Accessibility polish.** - Muted text is 4.47:1 on lilac panels; darken `--color-ink-muted` (`globals.css:35`). - The catalogue jumps from h1 to h3 (`ProductCard.tsx:69`). - The footer nav reuses the main label (`SiteFooter.tsx:56`). - No `aria-current` on the desktop nav. - Card images repeat the product name as alt text. - `aria-label` on a plain div (`FilterChips.tsx:71`). - Chip removal loses focus and scroll position (`FilterChips.tsx:76-91`).
- [ ] **P3-2 Metadata polish.** - Product OG drops `og:locale` (`lib/site/product.ts:34-43`). - Descriptions are cut mid-word. - About reuses the home description. - `x-default` is hard-coded to `/ckb` (`metadata.ts:20`, `sitemap.ts:17`). - The language switcher is client-only, so crawlers see no language links
      (`LanguageSwitcher.tsx:14`).
- [ ] **P3-3 Phone menu** doesn't close on an outside tap or Back/Forward (`MobileMenu.tsx:33-72`).
- [ ] **P3-4 Theme toggle** shows the wrong icon briefly in dark mode and has no "follow system"
      option (`ThemeToggle.tsx:185-209`).
- [ ] **P3-5 `searchFor.replace('{query}', …)`** garbles queries containing `$&`
      (`SiteSearch.tsx:340`).
- [ ] **P3-6 Slug generation** can run up to 98 sequential queries on every draft save
      (`hooks/slugs.ts:60-79`).
- [ ] **P3-7 Over-eager cache purges** on draft saves of never-published products and on every
      photo upload (`Products.ts:61`, `Media.ts:218`).
- [ ] **P3-8 Replaced photo files** miss the one-year cache header (`hooks/mediaCache.ts:54`).
- [ ] **P3-9 Admin home "drafts" count** ignores unpublished edits to published products
      (`components/admin/Home.tsx:36`).
- [ ] **P3-10 Cache-drop signature** never expires and reuses `PAYLOAD_SECRET`
      (`lib/site/outage.ts:33-40`). Sign it with a timestamp and a derived key.
- [ ] **P3-11 "Featured" has no limit.** Only 8 show on the home page, and extras are silently
      ignored (`Products.ts:162-168`). Warn the owner.
- [x] **P3-12 Stale `.next/dev/types`** makes `pnpm typecheck` fail locally after the `(home)` route
      group move. Delete `.next` (not a code bug). — _Done 2026-11-18: cleaned stale `.next` route
      types and regenerated with `next typegen`._

---

## Already done well (keep it this way)

- RTL handled carefully (logical insets, mirrored swipes, LTR-isolated prices), and reduced
  motion respected everywhere.
- Thorough empty, error and outage states, with an Instagram fallback; outage renders are
  dropped from the cache.
- Uploads validated by content, with metadata stripped, random names and phone-side resizing.
- Publishing rules enforced on the server and matching the live checklist; tight access
  control (no first-register, GraphQL off, CSRF/CORS pinned).
- Filters follow the URL without overwriting the visitor's typing; everything works without
  JavaScript.

## Change log

| Date       | Item        | Commit        | Notes                                                                                                                                            |
| ---------- | ----------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-18 | P2-4, P3-12 | 2a3b739       | Inline `DeliveryFees` on product pages with city revalidation hooks; regenerated types                                                           |
| 2026-11-19 | P0-1        | (this commit) | Payload 3.93 / Next 16.4.6 security upgrade, overrides, migration `payload_3_93`; typecheck, lint, 50 unit + 29 integration tests and build pass |
