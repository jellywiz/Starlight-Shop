import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

const OWNER = {
  email: process.env.E2E_OWNER_EMAIL ?? 'dev@example.com',
  password: process.env.E2E_OWNER_PASSWORD ?? 'Dev-password-1',
}
const SAMPLE_SLUG = 'sample-moon-necklace'

async function login(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(OWNER.email)
  await page.getByLabel('Password').fill(OWNER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/admin(\/)?$/)
}

/**
 * Clicks a save button and waits for the admin's PATCH request to succeed. Waiting for the
 * toast alone races: an earlier toast can still be on screen (sonner pauses its timer while
 * the admin tab is in the background), so the next public read could run before the save.
 */
async function saveWith(page: Page, button: string, collection: string) {
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.url().includes(`/api/${collection}/`),
  )
  await page.getByRole('button', { name: button }).click()
  expect((await saved).ok()).toBe(true)
  await expect(page.getByText(/successfully/i).first()).toBeVisible()
}

test.describe('admin journeys (A02, A05, A15, A21)', () => {
  test('login hides password reset and the price field stores whole dinars', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('link', { name: /forgot/i })).toBeHidden()
    await login(page)

    // The task-based home replaces Payload's dashboard.
    await expect(page.getByRole('link', { name: /Add a product/ })).toBeVisible()
    await expect(page.locator('.sl-tile--products')).toBeVisible()

    // The admin list shows the bilingual title (English · Kurdish); no locale switcher.
    await page.goto('/admin/collections/products?limit=10')
    await expect(page.getByText('Locale:')).toHaveCount(0)
    await page
      .getByRole('link', { name: /^Sample moon necklace · / })
      .first()
      .click()
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/)
    // No tabs: every section is on the page, and the technical tabs are gone.
    await expect(page.getByRole('link', { name: 'API' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Versions/ })).toHaveCount(0)
    const price = page.getByLabel('Price (IQD)')

    // Reset to the sample price so the test is repeatable regardless of earlier runs
    // (the Publish button stays disabled while nothing has changed).
    if ((await price.inputValue()) !== '32000') {
      await price.fill('32000')
      await saveWith(page, 'Publish changes', 'products')
      await page.reload()
    }
    await expect(price).toHaveValue('32000')
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
    await expect(page.getByText('Shown on the website as IQD 32,000')).toBeVisible()

    // Fractions are refused before anything is stored.
    await price.fill('32000.5')
    await expect(page.getByText('Enter whole dinars only, without decimals.')).toBeVisible()

    // Save a draft with a new price: the public page must keep the published price (A05).
    await price.fill('34,000')
    await expect(page.getByText('Shown on the website as IQD 34,000')).toBeVisible()
    await saveWith(page, 'Save Draft', 'products')
    await expect(page.getByText('Changed', { exact: true })).toBeVisible()

    const publicPage = await page.context().newPage()
    await publicPage.goto(`/en/products/${SAMPLE_SLUG}`)
    await expect(publicPage.getByText('IQD 32,000')).toBeVisible()
    // The owner's preview shows the draft price, marked as a preview and never indexed.
    await publicPage.goto(`/en/products/${SAMPLE_SLUG}/preview`)
    await expect(publicPage.getByText('IQD 34,000')).toBeVisible()
    await expect(publicPage.getByRole('status')).toContainText('Preview')
    await expect(publicPage.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    // Publish: a fresh request shows the new price (A15) even though product pages are
    // served from the cache — publishing invalidates them.
    await saveWith(page, 'Publish changes', 'products')
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
    await publicPage.goto(`/en/products/${SAMPLE_SLUG}`)
    await expect(publicPage.getByText('IQD 34,000')).toBeVisible()

    // Restore the sample price for repeatable runs.
    await price.fill('32000')
    await saveWith(page, 'Publish changes', 'products')
    await publicPage.reload()
    await expect(publicPage.getByText('IQD 32,000')).toBeVisible()
    await publicPage.close()
  })

  test('a delivery fee change appears on a fresh home request (A21)', async ({ page }) => {
    await login(page)
    await page.goto('/admin/collections/cities?limit=10')
    await page
      .getByRole('link', { name: /^Sample city 1 · / })
      .first()
      .click()
    await expect(page).toHaveURL(/\/admin\/collections\/cities\/\d+/)
    const fee = page.getByLabel('Delivery fee (IQD)')
    if ((await fee.inputValue()) === '5500') {
      // Left over from an interrupted run: put the sample fee back first.
      await fee.fill('5000')
      await saveWith(page, 'Save', 'cities')
    }
    await fee.fill('5500')
    await saveWith(page, 'Save', 'cities')

    const publicPage = await page.context().newPage()
    await publicPage.goto('/en')
    await publicPage.getByLabel('Your city').selectOption({ label: 'Sample city 1' })
    await expect(publicPage.getByText('Delivery to Sample city 1: IQD 5,500')).toBeVisible()
    await publicPage.close()

    // Restore the sample fee for repeatable runs.
    await fee.fill('5000')
    await saveWith(page, 'Save', 'cities')
  })

  test('a category is created with all three names on one form', async ({ page }) => {
    await login(page)
    // Repeatable: remove leftovers from interrupted runs (suffixed addresses included).
    await removeCategories(page, 'e2e-brooches')

    await page.goto('/admin/collections/categories/create')
    await expect(page.getByText('Locale:')).toHaveCount(0)
    // The three languages are inputs on the same page, no switching needed.
    await page.locator('#field-name__ckb').fill('بڕۆشی تاقیکردنەوە')
    await page.locator('#field-name__ar').fill('دبابيس تجريبية')
    await page.locator('#field-name__en').fill('E2E brooches')
    await page.getByLabel('Is Active').check()
    // No address (slug) field on the form: it is generated from the English name.
    await expect(page.locator('#field-slug')).toBeHidden()
    const created = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/api/categories'),
    )
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    const response = await created
    expect(response.ok()).toBe(true)
    expect((await response.json()).doc.slug).toBe('e2e-brooches')
    await expect(page.getByText(/successfully/i).first()).toBeVisible()
    // Bilingual title in the list.
    await page.goto('/admin/collections/categories?limit=20')
    await expect(page.getByRole('link', { name: 'E2E brooches · بڕۆشی تاقیکردنەوە' })).toBeVisible()

    await removeCategories(page, 'e2e-brooches')
  })

  test('an oversized photo is reduced in the browser before it is uploaded', async ({ page }) => {
    await login(page)
    await removeMedia(page, 'e2e-oversized')
    await page.goto('/admin/collections/media/create')
    await page.setInputFiles('input[type="file"]', {
      name: 'big.png',
      mimeType: 'image/png',
      buffer: await oversizedPng(),
    })
    await expect(page.locator('input[value="big.png"]')).toBeVisible()
    // 4+ MB of noise cannot stay a PNG under 3 MB, so it is re-encoded (the server's own
    // 3 MB rule is covered by tests/int/publishing.test.ts).
    const panel = page.locator('.sl-photo-prep')
    await expect(panel).toContainText(/Ready to upload — \d+(\.\d)? (KB|MB)/, { timeout: 30_000 })
    await expect(panel).toContainText(/Reduced from 1200 × 1200 \(\d+\.\d MB\)/)
    await page.locator('#field-altText').fill('e2e-oversized')
    const uploaded = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/media(\?|$)/.test(r.url()),
    )
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    const response = await uploaded
    expect(response.ok()).toBe(true)
    const doc = (await response.json()).doc
    expect(doc.filesize).toBeLessThan(3 * 1024 * 1024)
    expect(doc.width).toBe(1200)
    await expect(page.getByText(/successfully/i).first()).toBeVisible()
    await removeMedia(page, 'e2e-oversized')
  })

  test('a product is created with a photo uploaded from the form, published, edited and removed', async ({
    page,
  }, testInfo) => {
    // The same journey runs on the desktop, phone and iPad projects: the admin is used on
    // all three (docs/decisions.md "Admin look and feel").
    const suffix = testInfo.project.name
    const englishName = `E2E ${suffix} necklace`
    await login(page)
    await removeProducts(page, `e2e-${suffix}-necklace`)
    await removeMedia(page, `e2e-${suffix}`)

    await page.goto('/admin/collections/products/create')
    // The live checklist starts with everything missing and empties as fields are filled.
    const checklist = page.locator('.sl-checklist')
    await expect(checklist).toContainText('5 things to fill in before publishing')
    await page.locator('#field-name__ckb').fill(`ملوانکەی تاقیکردنەوە ${suffix}`)
    await page.locator('#field-name__ar').fill(`قلادة تجريبية ${suffix}`)
    await page.locator('#field-name__en').fill(englishName)
    await page.locator('#field-description__ckb').fill('وەسفی تاقیکردنەوە.')
    await page.locator('#field-description__ar').fill('وصف تجريبي.')
    await page.locator('#field-description__en').fill('An automated test description.')
    await page.locator('#field-category .rs__control').click()
    await page.getByRole('option', { name: /^Necklaces/ }).click()
    await expect(checklist).toContainText('2 things to fill in before publishing')
    await expect(checklist).toContainText('add at least one photo')

    // Photos: the "Create New" drawer uploads straight from the product form.
    await page.getByRole('button', { name: 'Create New' }).click()
    const drawer = page.locator('dialog.drawer--is-open').last()
    await drawer.locator('input[type="file"]').setInputFiles({
      name: `e2e-${suffix}.png`,
      mimeType: 'image/png',
      buffer: await samplePng(),
    })
    await expect(drawer.locator(`input[value="e2e-${suffix}.png"]`)).toBeVisible()
    // A small photo is sent as it is; the preparation panel still shows the preview.
    await expect(drawer.locator('.sl-photo-prep')).toContainText('Ready to upload')
    // The shared image description doubles as the marker that identifies test photos
    // (uploaded files get random names, see src/collections/Media.ts).
    await drawer.locator('#field-altText').fill(`e2e-${suffix}`)
    const uploaded = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/media(\?|$)/.test(r.url()),
    )
    await drawer.getByRole('button', { name: 'Save', exact: true }).first().click()
    const uploadResponse = await uploaded
    expect(uploadResponse.ok()).toBe(true)
    const photo = (await uploadResponse.json()).doc
    await expect(drawer).toBeHidden()
    await expect(
      page.locator('#field-photos').getByRole('link', { name: photo.filename }),
    ).toBeVisible()

    await page.getByLabel('Price (IQD)').fill('15000')
    await page.locator('#field-isAvailable').check()
    await expect(checklist).toContainText('Ready to publish')

    const created = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/products(\?|$)/.test(r.url()),
    )
    await page.getByRole('button', { name: 'Publish changes' }).click()
    const response = await created
    expect(response.ok()).toBe(true)
    const doc = (await response.json()).doc
    expect(doc.slug).toBe(`e2e-${suffix}-necklace`)
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/)
    await expect(page.getByText('Published', { exact: true })).toBeVisible()

    // Live on the website with the uploaded photo as the cover.
    const publicPage = await page.context().newPage()
    await publicPage.goto(`/en/products/${doc.slug}`)
    await expect(publicPage.getByRole('heading', { level: 1 })).toHaveText(englishName)
    await expect(publicPage.getByText('IQD 15,000')).toBeVisible()
    const cover = publicPage
      .getByRole('region', { name: 'Product photos' })
      .getByRole('img', { name: `e2e-${suffix}` })
      .first()
    await expect(cover).toHaveAttribute('src', new RegExp(photo.filename.replace(/\.png$/, '')))
    await expect(cover).toHaveJSProperty('complete', true)
    expect(await cover.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

    // Edit the price and publish again: the website shows the new price on a fresh request.
    await page.getByLabel('Price (IQD)').fill('16500')
    await saveWith(page, 'Publish changes', 'products')
    await publicPage.reload()
    await expect(publicPage.getByText('IQD 16,500')).toBeVisible()
    await publicPage.close()

    // Remove the test product and its photo (the photo cannot go first: it is in use).
    await removeProducts(page, `e2e-${suffix}-necklace`)
    await removeMedia(page, `e2e-${suffix}`)
    await publicPageGone(page, doc.slug)
  })

  test('the Appearance switch changes the theme and remembers it; a dark device is dark from the start', async ({
    browser,
    baseURL,
  }) => {
    // No choice saved and a dark device: dark before any JavaScript runs (the admin renders
    // in the browser, so this is the blank page a phone shows first), login page included.
    const darkDevice = await browser.newContext({
      baseURL,
      colorScheme: 'dark',
      javaScriptEnabled: false,
    })
    const blank = await darkDevice.newPage()
    await blank.goto('/admin/login')
    await expect(blank.locator('html')).toHaveAttribute('data-theme-auto', '')
    await expect(blank.locator('body')).toHaveCSS('background-color', 'rgb(26, 12, 27)')
    await darkDevice.close()

    const lightDevice = await browser.newContext({ baseURL, colorScheme: 'light' })
    const page = await lightDevice.newPage()
    await login(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const openMenu = page.getByRole('button', { name: 'Open Menu' }).locator('visible=true')
    const chooseAppearance = async (name: string) => {
      const option = page.getByRole('button', { name, exact: true })
      const navOpen = await page
        .locator('.nav')
        .first()
        .evaluate((nav) => nav.classList.contains('nav--nav-open'))
      if (!navOpen) {
        await openMenu.first().click()
      }
      await option.click()
      await expect(option).toHaveAttribute('aria-pressed', 'true')
    }

    await chooseAppearance('Dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-auto', '')
    expect((await lightDevice.cookies()).find((c) => c.name === 'payload-theme')?.value).toBe(
      'dark',
    )
    // The choice is saved: the server renders the next page dark straight away.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(26, 12, 27)')

    await chooseAppearance('Auto')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light') // light device
    await expect(page.locator('html')).toHaveAttribute('data-theme-auto', '')
    expect((await lightDevice.cookies()).find((c) => c.name === 'payload-theme')).toBeUndefined()
    await lightDevice.close()
  })
})

/** Deletes every document of `collection` matching the query (test fixtures only). */
async function removeDocuments(page: Page, collection: string, where: string) {
  // Cookie authentication needs the Origin header (CSRF check), which page.request omits.
  const headers = { Origin: new URL(page.url()).origin }
  const found = await page.request.get(`/api/${collection}?${where}&limit=50&depth=0`, {
    headers,
  })
  for (const doc of (await found.json()).docs ?? []) {
    const deleted = await page.request.delete(`/api/${collection}/${doc.id}`, { headers })
    expect(deleted.ok()).toBe(true)
  }
}

/** Deletes every category whose address starts with `slugPrefix`. */
const removeCategories = (page: Page, slugPrefix: string) =>
  removeDocuments(page, 'categories', `where[slug][like]=${encodeURIComponent(slugPrefix)}`)

/** Deletes every product (drafts included) whose address starts with `slugPrefix`. */
const removeProducts = (page: Page, slugPrefix: string) =>
  removeDocuments(
    page,
    'products',
    `where[slug][like]=${encodeURIComponent(slugPrefix)}&draft=true`,
  )

/** Deletes every photo whose image description starts with `descriptionPrefix`. */
const removeMedia = (page: Page, descriptionPrefix: string) =>
  removeDocuments(page, 'media', `where[altText][like]=${encodeURIComponent(descriptionPrefix)}`)

async function publicPageGone(page: Page, slug: string) {
  const response = await page.request.get(`/en/products/${slug}`)
  expect(response.status()).toBe(404)
}

/** A small valid photo (a star-coloured square) for upload journeys. */
async function samplePng(): Promise<Buffer> {
  return sharp({ create: { width: 480, height: 480, channels: 3, background: '#f6e3b4' } })
    .png()
    .toBuffer()
}

/** Incompressible pseudo-random pixels, so the PNG is well above the 3 MB upload limit. */
async function oversizedPng(): Promise<Buffer> {
  const side = 1200
  const noise = Buffer.alloc(side * side * 3)
  let state = 0x9e3779b9
  for (let i = 0; i < noise.length; i += 1) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    noise[i] = state & 0xff
  }
  return sharp(noise, { raw: { width: side, height: side, channels: 3 } })
    .png({ compressionLevel: 1 })
    .toBuffer()
}
