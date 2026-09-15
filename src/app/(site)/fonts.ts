import localFont from 'next/font/local'

/** Self-hosted variable fonts (see src/fonts/README.md). Only the weights used are loaded. */
export const notoSans = localFont({
  src: '../../fonts/NotoSans-latin-wght.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-latin',
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
})

export const notoSansArabic = localFont({
  src: '../../fonts/NotoSansArabic-wght.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-arabic',
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
})
