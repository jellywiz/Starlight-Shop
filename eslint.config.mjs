import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // Generated migration signatures keep unused arguments on purpose.
    files: ['src/migrations/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  globalIgnores([
    '.next/',
    'src/payload-types.ts',
    'src/migrations/*.json',
    'src/app/(payload)/admin/importMap.js',
    'media/',
    '.data/',
    'backups/',
    'playwright-report/',
    'test-results/',
    'next-env.d.ts',
  ]),
])
