import type { ReactNode } from 'react'

/** Minimal root layout for the locale-less entry route ("/"), which only redirects. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ckb" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
