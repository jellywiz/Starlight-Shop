import { defineConfig, devices } from '@playwright/test'

/**
 * Browser journeys (spec section 16). Expects a running site at BASE_URL (default
 * http://localhost:3000) with the development seed applied:
 *   pnpm build && pnpm start   (in one terminal, with the local database running)
 *   pnpm seed:dev --owner      (once)
 *   pnpm test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.e2e\.ts$/,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Optional: point at an already installed Chromium instead of `playwright install`.
    launchOptions: process.env.PLAYWRIGHT_CHROME_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
      : undefined,
  },
  // The admin is used on a phone and an iPad as much as on a computer, so every journey
  // runs on all three. Chromium plays the iPad (its viewport, touch and scale factor) so a
  // single browser install covers CI and local runs.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' } },
  ],
})
