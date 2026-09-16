import { expect, test } from '@playwright/test'

const SAMPLE_SLUG = 'sample-star-necklace'
const INSTAGRAM = 'https://www.instagram.com/sl_.jewellery/'

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
    isMobile,
    context,
  }) => {
    await page.goto('/en/products')
    if (isMobile) {
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
    isMobile,
  }) => {
    await page.goto(`/en/products/${SAMPLE_SLUG}`)
    if (isMobile) {
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
    isMobile,
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

    if (isMobile) {
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
