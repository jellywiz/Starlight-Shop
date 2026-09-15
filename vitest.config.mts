import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'int',
          environment: 'node',
          include: ['tests/int/**/*.test.ts'],
          globalSetup: ['tests/int/global-setup.ts'],
          setupFiles: ['tests/int/setup.ts'],
          // One database, one worker: integration files run sequentially.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
})
