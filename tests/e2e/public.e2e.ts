import { expect, test, type Page } from '@playwright/test'

const SAMPLE_SLUG = 'sample-star-necklace'
const INSTAGRAM = 'https://www.instagram.com/sl_.jewellery/'

const width = (page: Page) => page.viewportSize()?.width ?? 1280
/** Below Tailwind's `md` the catalogue filters live in a dialog behind a Filters button. */
const filtersInDialog = (page: Page) => width(page) < 768
/** Below `lg` the navigation and language links sit behind the Open menu button. */
const menuCollapsed = (page: Page) => width(page) < 1024

test.describe('public catalogue journeys (A01, A07, A10, A11, A22, A24)', () => {
  test('root redirects to the default language and pages carry lang/dir', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/ckb$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ckb')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    // Starlight identity, no shopping UI, no phone/WhatsApp/external shop (A01).
    await expect(page.getByRole('link', { name: 'Starlight Jewellery home' })).toBeVisible()
    await expect(page.getByText(/add to cart|buy now|checkout|place order|whatsapp/i)).toHaveCount(
      0,
    )
    await expect(page.locator('a[href^="tel:"], a[href*="wa.me"]')).toHaveCount(0)
  })

  test('search, filter, open a product, copy its link and find the Instagram action (A07, A11)', async ({
    page,
    context,
  }) => {
    await page.goto('/en/products')
    if (filtersInDialog(page)) {
      await page.getByRole('button', { name: 'Filters' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Search products').fill('star necklace')
      await dialog.getByRole('button', { name: 'Search' }).click()
    } else {
      const form = page.locator('aside form')
      await form.getByLabel('Search products').fill('star necklace')
      await form.getByRole('button', { name: 'Search' }).click()
    }
    await expect(page).toHaveURL(/q=star\+necklace|q=star%20necklace/)
    await expect(page.getByText(/1 product for/)).toBeVisible()
    await page.getByRole('link', { name: 'Sample star necklace' }).click()
    await expect(page).toHaveURL(new RegExp(`/en/products/${SAMPLE_SLUG}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sample star necklace')
    await expect(page.getByText('IQD 25,000')).toBeVisible()
    // No delivery fee or total inside the product pricing block (spec section 2).
    await expect(page.getByRole('main').getByText(/delivery to|free delivery/i)).toHaveCount(0)

    const enquire = page.getByRole('main').getByRole('link', { name: /Enquire on Instagram/ })
    await expect(enquire).toHaveAttribute('href', INSTAGRAM)
    await expect(enquire).toHaveAttribute('target', '_blank')
    await expect(enquire).toHaveAttribute('rel', /noopener/)

    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.getByRole('button', { name: 'Copy product link' }).click()
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(`http://localhost:3000/en/products/${SAMPLE_SLUG}`)
  })

  test('switching language keeps the same product and translates the page (A10)', async ({
    page,
  }) => {
    await page.goto(`/en/products/${SAMPLE_SLUG}`)
    if (menuCollapsed(page)) {
      await page.getByRole('button', { name: 'Open menu' }).click()
    }
    await page.getByRole('link', { name: 'العربية' }).click()
    await expect(page).toHaveURL(new RegExp(`/ar/products/${SAMPLE_SLUG}$`))
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('قلادة نجمة تجريبية')
    // Same digits, translated dinar label, readable in RTL (A10).
    await expect(page.getByText('25,000 د.ع')).toBeVisible()
  })

  test('returning to the catalogue keeps filters in the URL', async ({ page }) => {
    await page.goto('/en/products?category=necklaces&sort=price-asc')
    await page.getByRole('link', { name: 'Sample moon necklace' }).click()
    await expect(page).toHaveURL(/sample-moon-necklace/)
    await page.goBack()
    await expect(page).toHaveURL(/category=necklaces&sort=price-asc/)
  })

  test('filter fields follow the URL when a chip is removed or Back is pressed', async ({
    page,
  }) => {
    await page.goto('/en/products')
    if (filtersInDialog(page)) {
      // On a phone the form lives in a dialog: a change applies while it is open, and
      // reopening it after the results changed elsewhere shows the current filters.
      await page.getByRole('button', { name: 'Filters' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Category').selectOption('necklaces')
      await expect(page).toHaveURL(/category=necklaces/)
      await dialog.getByRole('button', { name: 'Close filters' }).click()
      await page.getByRole('link', { name: /Remove filter: Category: Necklaces/ }).click()
      await expect(page).toHaveURL(/\/en\/products$/)
      await page.getByRole('button', { name: 'Filters' }).click()
      await expect(page.getByRole('dialog').getByLabel('Category')).toHaveValue('')
      return
    }
    const form = page.locator('aside form')
    const category = form.getByLabel('Category')
    const search = form.getByLabel('Search products')

    await category.selectOption('necklaces')
    await expect(page).toHaveURL(/category=necklaces/)
    await search.fill('moon')
    await expect(page).toHaveURL(/q=moon/)
    await expect(form.getByLabel('Sort by')).toHaveValue('relevance')

    // Removing a chip is a plain link: the form must follow the new results.
    await page.getByRole('link', { name: /Remove filter: Category: Necklaces/ }).click()
    await expect(page).toHaveURL(/^(?!.*category=).*q=moon/)
    await expect(category).toHaveValue('')
    await expect(search).toHaveValue('moon')
    await expect(page.getByText(/products? for .moon./)).toBeVisible()

    // Back returns to the previous results and the fields show them again.
    await page.goBack()
    await expect(page).toHaveURL(/category=necklaces/)
    await expect(category).toHaveValue('necklaces')
    await expect(search).toHaveValue('moon')

    // Clear all: everything resets, including the availability radio.
    await form.getByLabel('Unavailable', { exact: true }).check()
    await expect(page).toHaveURL(/availability=unavailable/)
    await page.getByRole('link', { name: 'Clear all' }).click()
    await expect(page).toHaveURL(/\/en\/products$/)
    await expect(search).toHaveValue('')
    await expect(category).toHaveValue('')
    await expect(form.getByLabel('All', { exact: true })).toBeChecked()
    await expect(form.getByLabel('Sort by')).toHaveValue('newest')

    // Typing slower than the debounce makes results arrive while the visitor is still
    // typing; those results must never overwrite what was typed since.
    await search.pressSequentially('sample moon', { delay: 350 })
    await expect(search).toHaveValue('sample moon')
    await expect(page).toHaveURL(/q=sample\+moon$/)
    await expect(page.getByText(/1 product for .sample moon./)).toBeVisible()
    await expect(search).toHaveValue('sample moon')
  })

  test('a photo that cannot be loaded shows a Starlight placeholder and can be retried', async ({
    page,
  }) => {
    // Storage is down: every photo request fails.
    await page.route('**/api/media/file/**', (route) => route.abort())
    await page.goto('/en/products')
    const cards = page.locator('article')
    const placeholders = page.getByRole('group', { name: 'The photo could not be loaded' })
    await expect(placeholders.first()).toBeVisible()
    expect(await placeholders.count()).toBeGreaterThan(0)
    await expect(page.locator('article img')).toHaveCount(0)
    // The card is still a working link to the product.
    await expect(
      cards.first().getByRole('link', { name: /necklace|earrings|bracelet/i }),
    ).toBeVisible()

    // Storage is back: "Try again" reloads that photo, and only that one.
    await page.unroute('**/api/media/file/**')
    const first = placeholders.first()
    await first.getByRole('button', { name: 'Try again' }).click()
    const img = cards.first().locator('img')
    await expect(img).toHaveCount(1)
    await expect(img).toHaveJSProperty('complete', true)
    expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    await expect(img).toHaveAttribute('src', /retry=1/)
    expect(await placeholders.count()).toBeGreaterThan(0)

    // The product page gallery gets the same treatment, in Arabic.
    await page.route('**/api/media/file/**', (route) => route.abort())
    await page.goto(`/ar/products/${SAMPLE_SLUG}`)
    const gallery = page.getByRole('region', { name: 'صور المنتج' })
    await expect(gallery.getByRole('group', { name: 'تعذّر تحميل الصورة' }).first()).toBeVisible()
    await page.unroute('**/api/media/file/**')
    await gallery.getByRole('button', { name: 'إعادة المحاولة' }).first().click()
    await expect(gallery.locator('img').first()).toHaveJSProperty('complete', true)
  })

  test('invalid filters show translated messages and keep typed values', async ({ page }) => {
    await page.goto('/ckb/products?min=abc&max=5')
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.locator('input[name="min"]').first()).toHaveValue('abc')
  })

  test('a removed category shows the category-unavailable state with a clear action', async ({
    page,
  }) => {
    await page.goto('/en/products?category=gone&availability=available')
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'This category is no longer available.',
    )
    await page.getByRole('link', { name: 'Clear category' }).click()
    await expect(page).toHaveURL(/\/en\/products\?availability=available$/)
    await expect(page.getByText(/^\d+ products$/)).toBeVisible()
  })

  test('product pages come from the cache, the preview route is owner-only', async ({ page }) => {
    // Two requests: the second is served without rendering (next start reports the cache
    // state; the CDN does the same in production).
    const first = await page.request.get(`/en/products/${SAMPLE_SLUG}`)
    expect(first.ok()).toBe(true)
    const second = await page.request.get(`/en/products/${SAMPLE_SLUG}`)
    expect(second.headers()['x-nextjs-cache']).toBe('HIT')
    expect(second.headers()['cache-control']).toMatch(/s-maxage=/)
    // The home page and the catalogue depend on the URL and are never cached.
    const home = await page.request.get('/en')
    expect(home.headers()['cache-control']).toMatch(/no-store/)

    // A visitor who is not the owner is sent to the public page.
    await page.goto(`/en/products/${SAMPLE_SLUG}/preview`)
    await expect(page).toHaveURL(new RegExp(`/en/products/${SAMPLE_SLUG}$`))
    await expect(page.getByRole('status')).toHaveCount(0)
  })

  test('unknown product and unsupported locale return a 404 page with a catalogue link', async ({
    page,
  }) => {
    const response = await page.goto('/en/products/does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('link', { name: 'Go to the products' })).toBeVisible()
    const fr = await page.goto('/fr')
    expect(fr?.status()).toBe(404)
  })

  test('home delivery selector shows one city fee, keeps the city across languages and never a total (A22, A24)', async ({
    page,
  }) => {
    await page.goto('/en')
    const select = page.getByLabel('Your city')
    await expect(page.getByText('Select a city to see the delivery fee.')).toBeVisible()
    await select.selectOption({ label: 'Sample city 1' })
    await expect(page.getByText('Delivery to Sample city 1: IQD 5,000')).toBeVisible()
    await expect(page).toHaveURL(/\?city=\d+#delivery$/)
    // The zero-fee fixture reads as free delivery, never as a missing amount.
    await select.selectOption({ label: 'Sample city 2' })
    await expect(page.getByText('Delivery to Sample city 2: Free delivery')).toBeVisible()
    // Product prices are unchanged by the selection.
    await expect(page.getByText('IQD 25,000')).toBeVisible()
    await expect(page.getByText(/total/i)).toHaveCount(0)

    if (menuCollapsed(page)) {
      await page.getByRole('button', { name: 'Open menu' }).click()
    }
    await page.getByRole('link', { name: 'کوردی' }).click()
    await expect(page).toHaveURL(/\/ckb\?city=\d+/)
    await expect(page.getByText('گەیاندن بۆ شاری نموونە ٢: گەیاندنی بەخۆڕایی')).toBeVisible()

    // A city id that is not active is cleared with an explanation.
    await page.goto('/en?city=999999')
    await expect(page.getByText(/no longer listed/)).toBeVisible()
    await expect(page.getByLabel('Your city')).toHaveValue('')
  })

  test('contact page exposes the Instagram profile, the handle and the delivery link (A11)', async ({
    page,
  }) => {
    await page.goto('/en/contact')
    await expect(page.getByText('@sl_.jewellery').first()).toBeVisible()
    await expect(
      page.getByRole('main').getByRole('link', { name: /Open our Instagram profile/ }),
    ).toHaveAttribute('href', INSTAGRAM)
    await expect(
      page.getByRole('main').getByRole('link', { name: 'See delivery fees' }),
    ).toHaveAttribute('href', '/en#delivery')
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.locator('form')).toHaveCount(1) // only the header search form
  })

  test('the header switch toggles dark mode, remembers it, and the site otherwise follows the device', async ({
    browser,
    baseURL,
  }) => {
    // No choice yet: a dark device gets the dark theme (set by the inline script in <head>,
    // before the first paint).
    const darkDevice = await browser.newContext({ baseURL, colorScheme: 'dark' })
    const darkPage = await darkDevice.newPage()
    await darkPage.goto('/en', { waitUntil: 'domcontentloaded' })
    await expect(darkPage.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(darkPage.locator('body')).toHaveCSS('background-color', 'rgb(21, 10, 23)')
    await darkDevice.close()

    const lightDevice = await browser.newContext({ baseURL, colorScheme: 'light' })
    const page = await lightDevice.newPage()
    await page.goto('/ckb')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const toggle = page.locator('[data-theme-toggle]')
    await expect(toggle).toHaveAttribute('aria-label', 'گۆڕین بۆ دۆخی تاریک')
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(toggle).toHaveAttribute('aria-label', 'گۆڕین بۆ دۆخی ڕووناک')
    expect(await page.evaluate(() => localStorage.getItem('sl-theme'))).toBe('dark')

    // The choice survives a reload and a language switch (it is per browser, not per page).
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.goto('/en/products')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute(
      'aria-label',
      'Switch to light mode',
    )
    await page.locator('[data-theme-toggle]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await page.evaluate(() => localStorage.getItem('sl-theme'))).toBe('light')
    await lightDevice.close()
  })
})
