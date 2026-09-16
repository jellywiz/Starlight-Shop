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

test.describe('admin journeys (A02, A05, A15, A21)', () => {
  test.skip(({ isMobile }) => isMobile, 'Admin editing is verified on desktop.')

  test('login hides password reset and the price field stores whole dinars', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('link', { name: /forgot/i })).toBeHidden()
    await login(page)

    // The admin list shows titles in the selected content locale.
    await page.goto('/admin/collections/products?limit=10&locale=en')
    await page.getByRole('link', { name: 'Sample moon necklace', exact: true }).first().click()
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+/)
    await page.getByRole('button', { name: 'Price and availability' }).click()
    const price = page.getByLabel('Price (IQD)')

    // Reset to the sample price so the test is repeatable regardless of earlier runs
    // (the Publish button stays disabled while nothing has changed).
    if ((await price.inputValue()) !== '32000') {
      await price.fill('32000')
      await page.getByRole('button', { name: 'Publish changes' }).click()
      await expect(page.getByText(/successfully/i).first()).toBeVisible()
      await page.reload()
      await page.getByRole('button', { name: 'Price and availability' }).click()
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
    await page.getByRole('button', { name: 'Save Draft' }).click()
    await expect(page.getByText(/successfully/i).first()).toBeVisible()
    await expect(page.getByText('Changed', { exact: true })).toBeVisible()

    const publicPage = await page.context().newPage()
    await publicPage.goto(`/en/products/${SAMPLE_SLUG}`)
    await expect(publicPage.getByText('IQD 32,000')).toBeVisible()

    // Publish: a fresh request shows the new price (A15).
    await page.getByRole('button', { name: 'Publish changes' }).click()
    await expect(page.getByText(/successfully/i).first()).toBeVisible()
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
    await publicPage.reload()
    await expect(publicPage.getByText('IQD 34,000')).toBeVisible()

    // Restore the sample price for repeatable runs.
    await price.fill('32000')
    await page.getByRole('button', { name: 'Publish changes' }).click()
    await expect(page.getByText(/successfully/i).first()).toBeVisible()
    await publicPage.reload()
    await expect(publicPage.getByText('IQD 32,000')).toBeVisible()
    await publicPage.close()
  })

  test('a delivery fee change appears on a fresh home request (A21)', async ({ page }) => {
    await login(page)
    await page.goto('/admin/collections/cities?limit=10&locale=en')
    await page.getByRole('link', { name: 'Sample city 1', exact: true }).first().click()
    await expect(page).toHaveURL(/\/admin\/collections\/cities\/\d+/)
    const fee = page.getByLabel('Delivery fee (IQD)')
    if ((await fee.inputValue()) === '5500') {
      // Left over from an interrupted run: put the sample fee back first.
      await fee.fill('5000')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByText(/successfully/i).first()).toBeVisible()
    }
    await fee.fill('5500')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/successfully/i).first()).toBeVisible()

    const publicPage = await page.context().newPage()
    await publicPage.goto('/en')
    await publicPage.getByLabel('Your city').selectOption({ label: 'Sample city 1' })
    await expect(publicPage.getByText('Delivery to Sample city 1: IQD 5,500')).toBeVisible()
    await publicPage.close()

    // Restore the sample fee for repeatable runs.
    await fee.fill('5000')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/successfully/i).first()).toBeVisible()
  })

  test('an oversized photo is refused with the reason shown in the toast', async ({ page }) => {
    await login(page)
    await page.goto('/admin/collections/media/create?locale=en')
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
