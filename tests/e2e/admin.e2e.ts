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
  test.skip(({ isMobile }) => isMobile, 'Admin editing is verified on desktop.')

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

    // Publish: a fresh request shows the new price (A15).
    await saveWith(page, 'Publish changes', 'products')
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
    await publicPage.reload()
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

  test('an oversized photo is refused with the reason shown in the toast', async ({ page }) => {
    await login(page)
    await page.goto('/admin/collections/media/create')
    await page.setInputFiles('input[type="file"]', {
      name: 'big.png',
      mimeType: 'image/png',
      buffer: await oversizedPng(),
    })
    await expect(page.locator('input[value="big.png"]')).toBeVisible()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // The multipart parser cuts the file at 3 MB; the owner must still learn the real reason.
    await expect(page.getByText(/larger than 3 MB \(about \d+\.\d MB\)/)).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/collections\/media\/create/)
  })
})

/** Deletes every category whose address starts with `slugPrefix` (test fixtures only). */
async function removeCategories(page: Page, slugPrefix: string) {
  // Cookie authentication needs the Origin header (CSRF check), which page.request omits.
  const headers = { Origin: new URL(page.url()).origin }
  const found = await page.request.get(
    `/api/categories?where[slug][like]=${encodeURIComponent(slugPrefix)}&limit=50&depth=0`,
    { headers },
  )
  for (const doc of (await found.json()).docs ?? []) {
    const deleted = await page.request.delete(`/api/categories/${doc.id}`, { headers })
    expect(deleted.ok()).toBe(true)
  }
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
