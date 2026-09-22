import { expect, test } from '@playwright/test'

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} theme survives clearing filters and language navigation`, async ({ page }) => {
    // Choose the opposite of the device setting: navigation must retain the override.
    await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' })
    await page.goto('/en/products?availability=available')
    await page.locator('[data-theme-toggle]').click()

    const expectTheme = async () => {
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('body')).toHaveCSS(
        'background-color',
        theme === 'dark' ? 'rgb(21, 10, 23)' : 'rgb(252, 250, 252)',
      )
      expect(await page.evaluate(() => localStorage.getItem('sl-theme'))).toBe(theme)
    }
    await expectTheme()

    // The result chips use client navigation.
    await page.getByRole('link', { name: 'Clear all', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/products$/)
    await expectTheme()

    // The filter form's Clear filters link performs a full navigation.
    await page.goto('/en/products?availability=available')
    if ((page.viewportSize()?.width ?? 1280) < 768) {
      await page.getByRole('button', { name: 'Filters', exact: true }).click()
    }
    await page.getByRole('link', { name: 'Clear filters', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/products$/)
    await expectTheme()

    // Click real language links: page.goto would miss client-side layout remounts.
    for (const locale of ['ar', 'ckb', 'en']) {
      if ((page.viewportSize()?.width ?? 1280) < 1024) {
        await page.locator('header button[aria-expanded]').click()
      }
      await page.locator(`a[hreflang="${locale}"]:visible`).click()
      await expect(page).toHaveURL(new RegExp(`/${locale}/products$`))
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expectTheme()
    }
    await page.reload()
    await expectTheme()
  })
}
